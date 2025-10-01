import org.http4k.contract.meta
import org.http4k.contract.openapi.OpenAPIJackson.auto
import org.http4k.core.Body
import org.http4k.core.HttpHandler
import org.http4k.core.Method.GET
import org.http4k.core.Response
import org.http4k.core.Status.Companion.BAD_REQUEST
import org.http4k.core.Status.Companion.OK
import org.http4k.core.with
import java.io.BufferedReader
import java.io.IOException
import java.io.InputStreamReader
import java.net.InetAddress
import java.util.concurrent.TimeUnit
import javax.jmdns.JmDNS
import javax.jmdns.ServiceListener
import javax.jmdns.ServiceEvent
import java.util.concurrent.ConcurrentHashMap
import org.http4k.core.Request as HttpRequest

/**
 * Kotlin wrapper for executing ESP32 OTA uploads using espota.py
 * This class provides a clean interface to upload firmware over WiFi to ESP32 devices
 */
data class OtaDevice(
    val ipAddress: String,
    val deviceName: String,
    val version: String,
    val deviceBoard: String,
    val chipModel: String,
    val wifiRssi: String,
    val lastSeen: Long
)

object OtaDeviceDiscoveryService : Thread() {
    val discoveredDevices = ConcurrentHashMap<String, OtaDevice>()
    private const val SERVICE_TYPE = "_arduino._tcp.local."
    private lateinit var jmdns: JmDNS

    val devices: List<OtaDevice>
        get() = discoveredDevices.values.toList().sortedBy { it.deviceName }

    override fun run() {
        try {
            val address = InetAddress.getLocalHost()
            jmdns = JmDNS.create(address)

            jmdns.addServiceListener(SERVICE_TYPE, object : ServiceListener {
                override fun serviceResolved(event: ServiceEvent) {
                    val service = event.info
                    val ip = service.inet4Addresses.firstOrNull()?.hostAddress ?: return

                    println("Device Resolved: ${service.name} at $ip")
                    println("Properties: ${service.propertyNames.toList()}")

                    val now = System.currentTimeMillis()

                    val otaDevice = OtaDevice(
                        ipAddress = ip,
                        deviceName = service.name,
                        version = service.getPropertyString("version") ?: "N/A",
                        deviceBoard = service.getPropertyString("board") ?: "Unknown",
                        chipModel = service.getPropertyString("chip_model") ?: "Unknown",
                        wifiRssi = service.getPropertyString("wifi_rssi") ?: "Unknown",
                        lastSeen = now
                    )

                    discoveredDevices[ip] = otaDevice
                }

                override fun serviceAdded(event: ServiceEvent) {
                    jmdns.requestServiceInfo(event.type, event.name)
                }

                override fun serviceRemoved(event: ServiceEvent) {
                    println("Device Removed: ${event.name}")
                    val ip = event.info?.inet4Addresses?.firstOrNull()?.hostAddress
                    if (ip != null) {
                        discoveredDevices.remove(ip)
                    }
                }
            })

            while (!this.isInterrupted) {
                sleep(1000)
            }

        } catch (e: Exception) {
            System.err.println("JmDNS discovery error: ${e.message}")
        } finally {
            if (::jmdns.isInitialized) {
                jmdns.close()
            }
        }
    }

    fun stopDiscovery() {
        interrupt()
    }
}

private val OtaDeviceLens = Body.auto<List<OtaDevice>>().toLens()
private val exampleOtaDeviceList = listOf(
    OtaDevice(
        ipAddress = "192.168.0.0",
        deviceName = "TempMon-DeviceRoom1234",
        version = "1.0.0",
        deviceBoard = "esp32",
        chipModel = "ESP32D0WDQ6",
        wifiRssi = "-45",
        lastSeen = 0
    ))

/**
 * The HTTP endpoint now retrieves the cached list from the background service instantly.
 */
private val hadleGetOtaDevices: HttpHandler = { _: HttpRequest ->
    try {
        val devices = OtaDeviceDiscoveryService.devices
        Response(OK)
            .header("Content-Type", "text/plain")
            .with(OtaDeviceLens of devices)
            .withCorsHeaders()
    } catch (e: Exception) {
        Response(BAD_REQUEST)
            .header("Content-Type", "text/plain")
            .body("Error retrieving devices: ${e.message}")
            .withCorsHeaders()
    }
}
val otaDeviceRoutes = "/otaDevices" meta {
    summary = "Get all OTA update capable devices"
    operationId = "getAllOtaDevices"
    returning(OK, OtaDeviceLens to exampleOtaDeviceList, "Successful response OTA available devices")
    returning(BAD_REQUEST to "Error retrieving all rooms")
} bindContract GET to hadleGetOtaDevices

//THIS CODE IS NOT PRODUCTION READY AND THEREFORE NOT IMPLEMENTED IN THE APP
class EspOtaUploader(
    private val espotaPath: String = "./espota.py"
) {

    data class UploadResult(
        val success: Boolean,
        val output: String,
        val errorOutput: String,
        val exitCode: Int
    )

    data class ProgressInfo(
        val percentage: Int,
        val progressBar: String,
        val filledBars: Int,
        val totalBars: Int
    )

    data class OtaConfig(
        val deviceIp: String,
        val firmwarePath: String,
        val port: Int? = null,
        val auth: String? = null,
        val timeout: Int? = null,
        val debug: Boolean = true,
        val progress: Boolean = true,
        val spiffs: Boolean = false
    )
    /**
     * Upload firmware to ESP32 device over WiFi with configuration object
     */
    fun uploadFirmware(
        config: OtaConfig,
        timeoutMinutes: Long = 10,
        progressCallback: ((ProgressInfo) -> Unit)? = null
    ): UploadResult {
        val command = buildCommand(config)
        return executeCommand(command, timeoutMinutes, progressCallback)
    }

    /**
     * Simple upload with just IP and firmware path
     */
    fun uploadFirmware(
        deviceIp: String,
        firmwarePath: String,
        debug: Boolean = true,
        progress: Boolean = true,
        timeoutMinutes: Long = 10,
        progressCallback: ((ProgressInfo) -> Unit)? = null
    ): UploadResult {
        val config = OtaConfig(
            deviceIp = deviceIp,
            firmwarePath = firmwarePath,
            debug = debug,
            progress = progress
        )
        return uploadFirmware(config, timeoutMinutes, progressCallback)
    }

    /**
     * Upload firmware with authentication
     */
    fun uploadFirmwareWithAuth(
        deviceIp: String,
        firmwarePath: String,
        authPassword: String,
        debug: Boolean = true,
        progress: Boolean = true,
        timeoutMinutes: Long = 10,
        progressCallback: ((ProgressInfo) -> Unit)? = null
    ): UploadResult {
        val config = OtaConfig(
            deviceIp = deviceIp,
            firmwarePath = firmwarePath,
            auth = authPassword,
            debug = debug,
            progress = progress
        )
        return uploadFirmware(config, timeoutMinutes, progressCallback)
    }

    /**
     * Upload SPIFFS data
     */
    fun uploadSpiffs(
        deviceIp: String,
        spiffsPath: String,
        debug: Boolean = true,
        progress: Boolean = true,
        timeoutMinutes: Long = 10,
        progressCallback: ((ProgressInfo) -> Unit)? = null
    ): UploadResult {
        val config = OtaConfig(
            deviceIp = deviceIp,
            firmwarePath = spiffsPath,
            debug = debug,
            progress = progress,
            spiffs = true
        )
        return uploadFirmware(config, timeoutMinutes, progressCallback)
    }

    private fun buildCommand(config: OtaConfig): List<String> {
        val command = mutableListOf("python", espotaPath)

        // Add debug flag
        if (config.debug) {
            command.add("--debug")
        }

        // Add progress flag
        if (config.progress) {
            command.add("--progress")
        }

        // Add IP address
        command.addAll(listOf("-i", config.deviceIp))

        // Add port if specified
        config.port?.let {
            command.addAll(listOf("-p", it.toString()))
        }

        // Add authentication if specified
        config.auth?.let {
            command.addAll(listOf("-a", it))
        }

        // Add timeout if specified
        config.timeout?.let {
            command.addAll(listOf("-t", it.toString()))
        }

        // Add SPIFFS flag if needed
        if (config.spiffs) {
            command.add("--spiffs")
        }

        // Add firmware file
        command.addAll(listOf("-f", config.firmwarePath))

        return command
    }

    private fun executeCommand(
        command: List<String>,
        timeoutMinutes: Long,
        progressCallback: ((ProgressInfo) -> Unit)? = null
    ): UploadResult {
        return try {
            println("Executing command: ${command.joinToString(" ")}")

            val processBuilder = ProcessBuilder(command)
            processBuilder.redirectErrorStream(false)

            val process = processBuilder.start()

            val outputReader = BufferedReader(InputStreamReader(process.inputStream))
            val errorReader = BufferedReader(InputStreamReader(process.errorStream))

            val output = StringBuilder()
            val errorOutput = StringBuilder()

            val progressRegex = Regex("""Uploading:\s*\[([=\s]*)]\s*(\d+)%""")

            val outputThread = Thread {
                try {
                    outputReader.useLines { lines ->
                        lines.forEach { line ->
                            println(line)
                            output.append(line).append("\n")

                            progressCallback?.let { callback ->
                                val matchResult = progressRegex.find(line)
                                if (matchResult != null) {
                                    val progressBar = matchResult.groupValues[1]
                                    val percentage = matchResult.groupValues[2].toIntOrNull() ?: 0
                                    val filledBars = progressBar.count { it == '=' }
                                    val totalBars = progressBar.length

                                    val progressInfo = ProgressInfo(
                                        percentage = percentage,
                                        progressBar = progressBar,
                                        filledBars = filledBars,
                                        totalBars = totalBars
                                    )

                                    callback(progressInfo)
                                }
                            }
                        }
                    }
                } catch (e: IOException) {
                }
            }

            val errorThread = Thread {
                try {
                    errorReader.useLines { lines ->
                        lines.forEach { line ->
                            System.err.println(line)
                            errorOutput.append(line).append("\n")
                        }
                    }
                } catch (e: IOException) {
                    // Stream closed, this is normal
                }
            }

            outputThread.start()
            errorThread.start()

            val finished = process.waitFor(timeoutMinutes, TimeUnit.MINUTES)

            if (!finished) {
                process.destroyForcibly()
                return UploadResult(
                    success = false,
                    output = output.toString(),
                    errorOutput = "Process timed out after $timeoutMinutes minutes",
                    exitCode = -1
                )
            }

            // Wait for threads to finish reading
            outputThread.join(2000)
            errorThread.join(2000)

            val exitCode = process.exitValue()

            UploadResult(
                success = exitCode == 0,
                output = output.toString().trim(),
                errorOutput = errorOutput.toString().trim(),
                exitCode = exitCode
            )

        } catch (e: IOException) {
            UploadResult(
                success = false,
                output = "",
                errorOutput = "IOException: ${e.message}",
                exitCode = -1
            )
        } catch (e: InterruptedException) {
            UploadResult(
                success = false,
                output = "",
                errorOutput = "InterruptedException: ${e.message}",
                exitCode = -1
            )
        }
    }

    /**
     * Test if the espota.py script exists and is accessible
     */
    fun validateEspotaTool(): Boolean {
        return try {
            val command = listOf("python", espotaPath, "--help")
            val process = ProcessBuilder(command).start()
            val exitCode = process.waitFor(5, TimeUnit.SECONDS)
            exitCode && process.exitValue() == 0
        } catch (e: Exception) {
            false
        }
    }

    fun getVersion(): String {
        return try {
            val command = listOf("python", espotaPath, "--version")
            val process = ProcessBuilder(command).start()
            val output = process.inputStream.bufferedReader().readText()
            process.waitFor(5, TimeUnit.SECONDS)
            output.trim()
        } catch (e: Exception) {
            "Version check failed: ${e.message}"
        }
    }

    /**
     * Check if device is reachable
     */
    fun pingDevice(deviceIp: String, timeoutSeconds: Int = 5): Boolean {
        return try {
            val command = when (System.getProperty("os.name").lowercase()) {
                "windows" -> listOf("ping", "-n", "1", "-w", "${timeoutSeconds * 1000}", deviceIp)
                else -> listOf("ping", "-c", "1", "-W", timeoutSeconds.toString(), deviceIp)
            }

            val process = ProcessBuilder(command).start()
            val exitCode = process.waitFor(timeoutSeconds.toLong() + 2, TimeUnit.SECONDS)
            exitCode && process.exitValue() == 0
        } catch (e: Exception) {
            false
        }
    }
}

/**
 * Helper object with utility functions and configuration builders
 */
object EspOtaHelper {

    /**
     * Create configuration for standard OTA upload
     */
    fun createStandardConfig(
        deviceIp: String,
        firmwarePath: String,
        auth: String? = null
    ): EspOtaUploader.OtaConfig {
        return EspOtaUploader.OtaConfig(
            deviceIp = deviceIp,
            firmwarePath = firmwarePath,
            auth = auth,
            debug = true,
            progress = true
        )
    }

    /**
     * Create configuration for SPIFFS upload
     */
    fun createSpiffsConfig(
        deviceIp: String,
        spiffsPath: String,
        auth: String? = null
    ): EspOtaUploader.OtaConfig {
        return EspOtaUploader.OtaConfig(
            deviceIp = deviceIp,
            firmwarePath = spiffsPath,
            auth = auth,
            debug = true,
            progress = true,
            spiffs = true
        )
    }

    /**
     * Create configuration with custom port and timeout
     */
    fun createCustomConfig(
        deviceIp: String,
        firmwarePath: String,
        port: Int = 3232,
        auth: String? = null,
        timeout: Int = 30
    ): EspOtaUploader.OtaConfig {
        return EspOtaUploader.OtaConfig(
            deviceIp = deviceIp,
            firmwarePath = firmwarePath,
            port = port,
            auth = auth,
            timeout = timeout,
            debug = true,
            progress = true
        )
    }

    /**
     * Format progress information for display
     */
    fun formatProgress(progressInfo: EspOtaUploader.ProgressInfo): String {
        val percentage = progressInfo.percentage
        val filled = progressInfo.filledBars
        val total = progressInfo.totalBars


        return "Upload: $percentage% ($filled/$total bars)"
    }
}
fun main() {
    val otaUploader = EspOtaUploader(
        espotaPath = "./espota.py"
    )

    val deviceIp = "192.168.48.239"
    val firmwarePath = "/Users/ben/Code/TempMon/firmware.bin"

    println("Validating espota.py tool...")
    if (!otaUploader.validateEspotaTool()) {
        println("espota.py tool validation failed. Please check paths.")
        return
    }
    println("espota.py tool validated successfully")

    println("\n Testing device connectivity...")
    if (!otaUploader.pingDevice(deviceIp)) {
        println("Device ping failed, but continuing anyway...")
    } else {
        println("Device is reachable")
    }

    val result = otaUploader.uploadFirmware(
        deviceIp = deviceIp,
        firmwarePath = firmwarePath,
        debug = true,
        progress = true,
        timeoutMinutes = 10,
        progressCallback = { progressInfo ->
            val formattedProgress = EspOtaHelper.formatProgress(progressInfo)
            println(formattedProgress)

        }
    )

    println("\n" + "=".repeat(50))
    if (result.success) {
        println("FIRMWARE UPLOAD SUCCESSFUL!")
        if (result.output.isNotEmpty()) {
            println("Output summary: ${result.output.takeLast(200)}")
        }
    } else {
        println("FIRMWARE UPLOAD FAILED!")
        println("Exit code: ${result.exitCode}")
        if (result.errorOutput.isNotEmpty()) {
            println("Error details: ${result.errorOutput}")
        }
    }
    println("=".repeat(50))

}