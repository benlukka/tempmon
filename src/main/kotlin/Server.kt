package com.benlukka.codiac

import JooqProvider
import RequestBodyLenses.request

import org.http4k.core.HttpHandler
import org.http4k.core.Method.POST
import org.http4k.core.Method.GET
import org.http4k.core.Request as HttpRequest // Alias org.http4k.core.Request to HttpRequest
import org.http4k.core.Response
import org.http4k.core.Status.Companion.BAD_REQUEST
import org.http4k.core.Status.Companion.OK
import org.http4k.core.Uri
import org.http4k.core.Body
import org.http4k.routing.ResourceLoader.Companion.Classpath
import org.http4k.routing.RoutingHttpHandler
import org.http4k.routing.bind
import org.http4k.routing.routes
import com.benlukka.Request // Your base polymorphic Request class
import com.benlukka.HumidityRequest
import com.benlukka.TemperatureHumidityRequest
import com.benlukka.TemperatureRequest
import org.http4k.format.Jackson
import org.http4k.format.Jackson.auto // This provides the Body.auto extension function
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import org.http4k.contract.meta
import org.http4k.contract.contract
import org.http4k.contract.openapi.ApiInfo
import org.http4k.contract.openapi.v3.ApiServer
import org.http4k.contract.openapi.v3.OpenApi3
import org.http4k.lens.Query
import org.http4k.lens.string
import org.http4k.lens.int
import org.http4k.routing.singlePageApp

class RequestApplication {

    private val jooqProvider = JooqProvider()

    init {
        // Initialize the database when the application starts
        jooqProvider.initializeDatabase()
    }

    // Helper function to add CORS headers to responses
    private fun Response.withCorsHeaders(): Response {
        return this
            .header("Access-Control-Allow-Origin", "http://localhost:3000")
            .header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
            .header("Access-Control-Allow-Headers", "Content-Type, Authorization")
            .header("Access-Control-Allow-Credentials", "true")
    }

    private val handleRequest: HttpHandler = { httpRequest: HttpRequest -> // Use HttpRequest alias for clarity
        try {
            // Extract the polymorphic Request object from the request body using the 'request' lens
            val myRequest: Request = request(httpRequest)

            // Extract client information from the request
            val ipAddress = httpRequest.header("X-Forwarded-For") ?: httpRequest.header("Remote-Addr") ?: "unknown"
            val macAddress = httpRequest.header("X-MAC-Address")
            val deviceName = httpRequest.header("X-Device-Name")

            // Process the request based on its concrete type and save to database
            val responseMessage = when (myRequest) {
                is TemperatureHumidityRequest -> {
                    jooqProvider.saveMeasurement(
                        temperature = myRequest.temperature?.toFloat(),
                        ipAddress = ipAddress,
                        macAddress = macAddress,
                        deviceName = deviceName
                    )
                    "Received TemperatureHumidityRequest: Temp=${myRequest.temperature}, Humidity=${myRequest.humidity}"
                }
                is HumidityRequest -> {
                    // Save only humidity
                    jooqProvider.saveMeasurement(
                        humidity = myRequest.humidity?.toFloat(),
                        ipAddress = ipAddress,
                        macAddress = macAddress,
                        deviceName = deviceName
                    )
                    "Received HumidityRequest: Humidity=${myRequest.humidity}"
                }
                is TemperatureRequest -> {
                    // Save only temperature
                    jooqProvider.saveMeasurement(
                        temperature = myRequest.temperature?.toFloat(),
                        ipAddress = ipAddress,
                        macAddress = macAddress,
                        deviceName = deviceName
                    )
                    "Received TemperatureRequest: Temp=${myRequest.temperature}"
                }
                else -> "Received an unknown type of Request: ${myRequest::class.simpleName}"
            }
            Response(OK)
                .header("Content-Type", "text/plain")
                .body(responseMessage)
                .withCorsHeaders()
        } catch (e: Exception) {
            Response(BAD_REQUEST)
                .header("Content-Type", "text/plain")
                .body("Invalid request body: ${e.message}")
                .withCorsHeaders()
        }
    }

    // Handler for getting all measurements with pagination
    private val handleGetAllMeasurements: HttpHandler = { httpRequest ->
        try {
            val limit = httpRequest.query("limit")?.toIntOrNull() ?: 100
            val offset = httpRequest.query("offset")?.toIntOrNull() ?: 0

            val measurements = jooqProvider.getAllMeasurements(limit, offset)

            Response(OK)
                .header("Content-Type", "application/json")
                .body(Jackson.asFormatString(measurements))
                .withCorsHeaders()
        } catch (e: Exception) {
            Response(BAD_REQUEST)
                .header("Content-Type", "text/plain")
                .body("Error retrieving measurements: ${e.message}")
                .withCorsHeaders()
        }
    }
    private val handleGetAllMeasurementsForDevice: HttpHandler = { httpRequest ->
        try {
            val limit = httpRequest.query("limit")?.toIntOrNull() ?: 100
            val offset = httpRequest.query("offset")?.toIntOrNull() ?: 0
            val deviceMac = httpRequest.header("deviceMac") ?: throw IllegalArgumentException("Missing deviceMac header")
            val measurements = jooqProvider.getMeasurementsByMacAddress(deviceMac, limit, offset)

            Response(OK)
                .header("Content-Type", "application/json")
                .body(Jackson.asFormatString(measurements))
                .withCorsHeaders()
        } catch (e: Exception) {
            Response(BAD_REQUEST)
                .header("Content-Type", "text/plain")
                .body("Error retrieving measurements: ${e.message}")
                .withCorsHeaders()
        }
    }
    private val handleGetAllDevices: HttpHandler = { httpRequest ->
        try {
            val limit = httpRequest.query("limit")?.toIntOrNull() ?: 100
            val offset = httpRequest.query("offset")?.toIntOrNull() ?: 0

            val devices = jooqProvider.getAllDevices(limit, offset)

            Response(OK)
                .header("Content-Type", "application/json")
                .body(Jackson.asFormatString(devices))
                .withCorsHeaders()
        } catch (e: Exception) {
            Response(BAD_REQUEST)
                .header("Content-Type", "text/plain")
                .body("Error retrieving measurements: ${e.message}")
                .withCorsHeaders()
        }
    }

    // Handler for getting measurements in a time range
    private val handleGetMeasurementsInTimeRange: HttpHandler = { httpRequest ->
        try {
            val formatter = DateTimeFormatter.ISO_DATE_TIME

            val startTimeStr = httpRequest.query("startTime")
            val endTimeStr = httpRequest.query("endTime")

            val startTime = if (startTimeStr != null) LocalDateTime.parse(startTimeStr, formatter) else LocalDateTime.now().minusDays(1)
            val endTime = if (endTimeStr != null) LocalDateTime.parse(endTimeStr, formatter) else LocalDateTime.now()

            val measurements = jooqProvider.getMeasurementsInTimeRange(startTime, endTime)

            Response(OK)
                .header("Content-Type", "application/json")
                .body(Jackson.asFormatString(measurements))
                .withCorsHeaders()
        } catch (e: Exception) {
            Response(BAD_REQUEST)
                .header("Content-Type", "text/plain")
                .body("Error retrieving measurements in time range: ${e.message}")
                .withCorsHeaders()
        }
    }

    // Define a lens for a single Float value
    private val averageValueBodyLens = Body.auto<Float>().toLens()

    private val handleGetAverageTemperatureInTimeRange: HttpHandler = { httpRequest ->
        try {
            val formatter = DateTimeFormatter.ISO_DATE_TIME

            val startTimeStr = httpRequest.query("startTime")
            val endTimeStr = httpRequest.query("endTime")

            val startTime = if (startTimeStr != null) LocalDateTime.parse(startTimeStr, formatter) else LocalDateTime.now().minusDays(1)
            val endTime = if (endTimeStr != null) LocalDateTime.parse(endTimeStr, formatter) else LocalDateTime.now()

            val averageTemp: Float? = jooqProvider.getAverageTemperature(startTime, endTime)

            // Use the lens to set the response body for a single Float
            val response = Response(OK)
                .header("Content-Type", "application/json")
                .withCorsHeaders()

            averageTemp?.let { avg ->
                averageValueBodyLens.inject(avg, response) // Inject the Float directly
            } ?: response.body("null") // If averageTemp is null, return "null" as the body

        } catch (e: Exception) {
            Response(BAD_REQUEST)
                .header("Content-Type", "text/plain")
                .body("Error retrieving average temperature in time range: ${e.message}")
                .withCorsHeaders()
        }
    }
    private val handleGetAverageHumidityInTimeRange: HttpHandler = { httpRequest ->
        try {
            val formatter = DateTimeFormatter.ISO_DATE_TIME

            val startTimeStr = httpRequest.query("startTime")
            val endTimeStr = httpRequest.query("endTime")

            val startTime = if (startTimeStr != null) LocalDateTime.parse(startTimeStr, formatter) else LocalDateTime.now().minusDays(1)
            val endTime = if (endTimeStr != null) LocalDateTime.parse(endTimeStr, formatter) else LocalDateTime.now()

            val averageHumidity: Float? = jooqProvider.getAverageHumidity(startTime, endTime)

            // Use the lens to set the response body for a single Float
            val response = Response(OK)
                .header("Content-Type", "application/json")
                .withCorsHeaders()

            averageHumidity?.let { avg ->
                averageValueBodyLens.inject(avg, response) // Inject the Float directly
            } ?: response.body("null") // If averageHumidity is null, return "null" as the body

        } catch (e: Exception) {
            Response(BAD_REQUEST)
                .header("Content-Type", "text/plain")
                .body("Error retrieving average humidity in time range: ${e.message}")
                .withCorsHeaders()
        }
    }
    // Handler for getting the latest measurements by device
    private val handleGetLatestMeasurementsByDevice: HttpHandler = { _ ->
        try {
            val measurements = jooqProvider.getLatestMeasurementsByDevice()

            Response(OK)
                .header("Content-Type", "application/json")
                .body(Jackson.asFormatString(measurements))
                .withCorsHeaders()
        } catch (e: Exception) {
            Response(BAD_REQUEST)
                .header("Content-Type", "text/plain")
                .body("Error retrieving latest measurements by device: ${e.message}")
                .withCorsHeaders()
        }
    }

    // Handler for serving the OpenAPI spec
    private val handleOpenApiSpec: HttpHandler = {
        Response(OK)
            .header("Content-Type", "application/json")
            .body(Classpath("/openapi.json").load("openapi.json")?.readText() ?: "{}")
            .withCorsHeaders()
    }

    // Define response body lens for Measurement list
    private val measurementsListBodyLens = Body.auto<List<JooqProvider.Measurement>>().toLens()
    // Define response body lens for Device list
    private val devicesListBodyLens = Body.auto<List<JooqProvider.Device>>().toLens()

    // Example placeholder data for the lenses
    private val measurementsExample = listOf(
        JooqProvider.Measurement(
            id = 1,
            temperature = 22.5f,
            humidity = 55.0f,
            timestamp = LocalDateTime.now(),
            ipAddress = "192.168.1.100",
            macAddress = "00:11:22:33:44:55",
            deviceName = "Sensor1"
        )
    )
    private val devicesExample = listOf(
        JooqProvider.Device(
            macAddress = "00:11:22:33:44:55",
            name = "Sensor1"
        )
    )


    private val measurementsRoute = "/measurements" meta {
        summary = "Get all measurements"
        description = "Retrieves all measurements from the database with pagination"
        operationId = "getAllMeasurements"
        queries += Query.int().optional("limit", "Maximum number of measurements to retrieve (default: 100)")
        queries += Query.int().optional("offset", "Offset to start retrieving measurements from (default: 0)")
        // Corrected returning syntax with example:
        returning(OK, measurementsListBodyLens to measurementsExample, "Successful response with measurements")
        returning(BAD_REQUEST to "Error retrieving measurements")
    } bindContract GET to handleGetAllMeasurements

    private val measurementsDeviceRoute = "/measurements/device" meta {
        summary = "Get all measurements by device"
        description = "Retrieves all measurements from the database with pagination for a specific device"
        operationId = "getAllMeasurementsForDevice"
        queries += Query.int().optional("limit", "Maximum number of measurements to retrieve (default: 100)")
        queries += Query.int().optional("offset", "Offset to start retrieving measurements from (default: 0)")
        queries += Query.string().required("deviceMac", "MAC address of the device to filter measurements by")
        // Corrected returning syntax with example:
        returning(OK, measurementsListBodyLens to measurementsExample, "Successful response with measurements")
        returning(BAD_REQUEST to "Error retrieving measurements")
    } bindContract GET to handleGetAllMeasurementsForDevice

    private val devicesRoute = "/devices" meta {
        summary = "Get all devices"
        description = "Retrieves all devices from the database with pagination"
        operationId = "getAllDevices"
        queries += Query.int().optional("limit", "Maximum number of measurements to retrieve (default: 100)")
        queries += Query.int().optional("offset", "Offset to start retrieving measurements from (default: 0)")
        // Corrected returning syntax with example:
        returning(OK, devicesListBodyLens to devicesExample, "Successful response with devices")
        returning(BAD_REQUEST to "Error retrieving devices")
    } bindContract GET to handleGetAllDevices

    private val measurementsTimeRangeRoute = "/measurements/timerange" meta {
        summary = "Get measurements in time range"
        description = "Retrieves measurements from the database within a specified time range"
        operationId = "getMeasurementsInTimeRange"
        queries += Query.string().optional("startTime", "Start time in ISO format (default: 24 hours ago)")
        queries += Query.string().optional("endTime", "End time in ISO format (default: now)")
        // Corrected returning syntax with example:
        returning(OK, measurementsListBodyLens to measurementsExample, "Successful response with measurements in time range")
        returning(BAD_REQUEST to "Error retrieving measurements in time range")
    } bindContract GET to handleGetMeasurementsInTimeRange

    private val avgTemperatureTimeRangeRoute = "/measurements/avgTemperature" meta {
        summary = "Get average temperature in time range"
        description = "Retrieves average temperature from the database within a specified time range"
        operationId = "getAvgTemperatureInTimeRange"
        queries += Query.string().optional("startTime", "Start time in ISO format (default: 24 hours ago)")
        queries += Query.string().optional("endTime", "End time in ISO format (default: now)")
        // Use the new averageValueBodyLens with a Float example
        returning(OK, averageValueBodyLens to 25.5f, "Successful response with average temperature")
        returning(BAD_REQUEST to "Error retrieving average temperature in time range")
    } bindContract GET to handleGetAverageTemperatureInTimeRange

    private val avgHumidityTimeRangeRoute = "/measurements/avgHumidity" meta {
        summary = "Get average humidity in time range"
        description = "Retrieves average humidity from the database within a specified time range"
        operationId = "getAvgHumidityInTimeRange"
        queries += Query.string().optional("startTime", "Start time in ISO format (default: 24 hours ago)")
        queries += Query.string().optional("endTime", "End time in ISO format (default: now)")
        // Use the new averageValueBodyLens with a Float example
        returning(OK, averageValueBodyLens to 60.2f, "Successful response with average humidity")
        returning(BAD_REQUEST to "Error retrieving average humidity in time range")
    } bindContract GET to handleGetAverageHumidityInTimeRange

    private val latestMeasurementsRoute = "/measurements/latest" meta {
        summary = "Get latest measurements by device"
        description = "Retrieves the latest measurement for each device"
        operationId = "getLatestMeasurementsByDevice"
        // Corrected returning syntax with example:
        returning(OK, measurementsListBodyLens to measurementsExample, "Successful response with latest measurements by device")
        returning(BAD_REQUEST to "Error retrieving latest measurements by device")
    } bindContract GET to handleGetLatestMeasurementsByDevice

    private val requestRoute = "/request" meta {
        summary = "Submit measurement data"
        description = "Submit temperature and/or humidity data from a device"
        operationId = "submitMeasurementData"
        // The `receiving` function still uses the lens directly with an example
        receiving(request to TemperatureHumidityRequest(
            type = "TEMPERATURE_HUMIDITY",
            temperature = 25,
            humidity = 60
        ))
        returning(OK to "Successful submission")
        returning(BAD_REQUEST to "Invalid request body")
    } bindContract POST to handleRequest

    val app: RoutingHttpHandler = routes(
        contract {
            renderer = OpenApi3(ApiInfo(title = "Tempmon API", version = "3.0.0"),
                servers = listOf(ApiServer(Uri.of("http://localhost:9000"))),
            )
            descriptionPath = "/appApi.json"
            routes += listOf(
                measurementsRoute,
                measurementsDeviceRoute,
                measurementsTimeRangeRoute,
                avgTemperatureTimeRangeRoute,
                avgHumidityTimeRangeRoute,
                latestMeasurementsRoute,
                requestRoute,
                devicesRoute,
            )
        },
        "/appApi.json" bind GET to handleOpenApiSpec,
        "/" bind singlePageApp(Classpath("/static"))
    )
}