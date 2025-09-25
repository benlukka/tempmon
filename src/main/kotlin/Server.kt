import RequestBodyLenses.request

import org.http4k.core.Method.POST
import org.http4k.core.Method.GET
import org.http4k.core.Request as HttpRequest // Alias org.http4k.core.Request to HttpRequest
import org.http4k.core.Status.Companion.BAD_REQUEST
import org.http4k.core.Status.Companion.OK
import org.http4k.routing.ResourceLoader.Companion.Classpath
import org.http4k.routing.RoutingHttpHandler
import org.http4k.routing.bind
import org.http4k.routing.routes
import org.http4k.format.Jackson
import org.http4k.format.Jackson.auto // This provides the Body.auto extension function
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import org.http4k.contract.meta
import org.http4k.contract.contract
import org.http4k.contract.openapi.ApiInfo
import org.http4k.contract.openapi.v3.ApiServer
import org.http4k.contract.openapi.v3.OpenApi3
import org.http4k.core.*
import org.http4k.lens.Query
import org.http4k.lens.string
import org.http4k.lens.int
import org.http4k.routing.*

class RequestApplication {

    private val jooqProvider = JooqProvider
    init {
        jooqProvider.initializeDatabase()
    }

    // Helper function to add CORS headers to responses
    private fun Response.withCorsHeaders(): Response {
        return this
            .header("Access-Control-Allow-Origin", "*")
            .header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
            .header("Access-Control-Allow-Headers", "Content-Type, Authorization")
            .header("Access-Control-Allow-Credentials", "true")
    }

    private val handleRequest: HttpHandler = { httpRequest: HttpRequest ->
        try {
            val myRequest: Request = request(httpRequest)

            val ipAddress = httpRequest.source?.address ?: "unknown"
            val macAddress = httpRequest.query("X-MAC-Address")
            val deviceName = httpRequest.query("X-Device-Name")

            // Process the request based on its concrete type and save to database
            val responseMessage = when (myRequest) {
                is TemperatureHumidityRequest -> {
                    jooqProvider.saveMeasurement(
                        temperature = myRequest.temperature,
                        humidity = myRequest.humidity,
                        ipAddress = ipAddress,
                        macAddress = macAddress,
                        deviceName = deviceName
                    )
                    "Received TemperatureHumidityRequest: Temp=${myRequest.temperature}, Humidity=${myRequest.humidity}"
                }
                is HumidityRequest -> {
                    jooqProvider.saveMeasurement(
                        humidity = myRequest.humidity,
                        ipAddress = ipAddress,
                        macAddress = macAddress,
                        deviceName = deviceName
                    )
                    "Received HumidityRequest: Humidity=${myRequest.humidity}"
                }
                is TemperatureRequest -> {
                    jooqProvider.saveMeasurement(
                        temperature = myRequest.temperature,
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
    data class MeasurmentsWithCount(
        val measurements: List<JooqProvider.Measurement>,
        val count: Int
    )
    private val measurementsWithCountLens = Body.auto<MeasurmentsWithCount>().toLens()
    private val handleGetAllMeasurements: HttpHandler = { httpRequest ->
        try {
            val limit = httpRequest.query("limit")?.toIntOrNull() ?: 100
            val offset = httpRequest.query("offset")?.toIntOrNull() ?: 0

            val measurements = jooqProvider.getAllMeasurements(limit, offset)

            Response(OK)
                .header("Content-Type", "application/json")
                .with(measurementsWithCountLens of MeasurmentsWithCount(
                    measurements = measurements,
                    count = jooqProvider.getCountOfMeasurements()
                )
                )
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
    private val handleGetAllMeasurementsForRoom: HttpHandler = { httpRequest ->
        try {
            val limit = httpRequest.query("limit")?.toIntOrNull() ?: 100
            val offset = httpRequest.query("offset")?.toIntOrNull() ?: 0
            val room = httpRequest.query("room") ?: throw IllegalArgumentException("Missing room parameter")
            val measurements = jooqProvider.getMeasurementsByRoom(room, limit, offset)

            Response(OK)
                .header("Content-Type", "application/json")
                .with(measurementsListBodyLens of measurements)
                .withCorsHeaders()
        } catch (e: Exception) {
            Response(BAD_REQUEST)
                .header("Content-Type", "text/plain")
                .body("Error retrieving measurements for room: ${e.message}")
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
                .body("Error retrieving devices: ${e.message}")
                .withCorsHeaders()
        }
    }
    private val formatter = DateTimeFormatter.ISO_DATE_TIME

    // Handler for getting measurements in a time range
    private val handleGetMeasurementsInTimeRange: HttpHandler = { httpRequest ->
        try {
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
    private val roomLens = Body.auto<List<JooqProvider.Room>>().toLens()

    private val handleGetRooms: HttpHandler = { _ ->
        try {
            val rooms = jooqProvider.getAllRooms()
            Response(OK)
                .header("Content-Type", "application/json")
                .with(roomLens of rooms)
                .withCorsHeaders()
        } catch (e: Exception) {
            Response(BAD_REQUEST)
                .header("Content-Type", "text/plain")
                .body("Error retrieving rooms by device: ${e.message}")
                .withCorsHeaders()
        }
    }

    private val handleOpenApiSpec: HttpHandler = {
        Response(OK)
            .header("Content-Type", "application/json")
            .body(Classpath("/openapi.json").load("openapi.json")?.readText() ?: "{}")
            .withCorsHeaders()
    }

    private val measurementsListBodyLens = Body.auto<List<JooqProvider.Measurement>>().toLens()
    private val devicesListBodyLens = Body.auto<List<JooqProvider.Device>>().toLens()

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
    private val measurmentsWithCountExample = MeasurmentsWithCount(
        measurements = measurementsExample,
        count = 1
    )

    private val devicesExample = listOf(
        JooqProvider.Device(
            macAddress = "00:11:22:33:44:55",
            name = "Sensor1"
        )
    )

    private val roomsExample = listOf(
        JooqProvider.Room(
            name = "11b",
            devices = listOf(
                JooqProvider.Device(macAddress = "00:11:22:33:44:55", name = "11b Room Sensor")
            )
        )
    )
    private val measurementsRoute = "/measurements" meta {
        summary = "Get all measurements"
        description = "Retrieves all measurements from the database with pagination"
        operationId = "getAllMeasurements"
        queries += Query.int().optional("limit", "Maximum number of measurements to retrieve (default: 100)")
        queries += Query.int().optional("offset", "Offset to start retrieving measurements from (default: 0)")
        returning(OK, measurementsWithCountLens to measurmentsWithCountExample, "Successful response with measurements")
        returning(BAD_REQUEST to "Error retrieving measurements")
    } bindContract GET to handleGetAllMeasurements

    private val measurementsDeviceRoute = "/measurements/device" meta {
        summary = "Get all measurements by device"
        description = "Retrieves all measurements from the database with pagination for a specific device"
        operationId = "getAllMeasurementsForDevice"
        queries += Query.int().optional("limit", "Maximum number of measurements to retrieve (default: 100)")
        queries += Query.int().optional("offset", "Offset to start retrieving measurements from (default: 0)")
        queries += Query.string().required("deviceMac", "MAC address of the device to filter measurements by")
        returning(OK, measurementsListBodyLens to measurementsExample, "Successful response with measurements")
        returning(BAD_REQUEST to "Error retrieving measurements")
    } bindContract GET to handleGetAllMeasurementsForDevice

    private val devicesRoute = "/devices" meta {
        summary = "Get all devices"
        description = "Retrieves all devices from the database with pagination"
        operationId = "getAllDevices"
        queries += Query.int().optional("limit", "Maximum number of measurements to retrieve (default: 100)")
        queries += Query.int().optional("offset", "Offset to start retrieving measurements from (default: 0)")
        returning(OK, devicesListBodyLens to devicesExample, "Successful response with devices")
        returning(BAD_REQUEST to "Error retrieving devices")
    } bindContract GET to handleGetAllDevices

    private val measurementsTimeRangeRoute = "/measurements/timerange" meta {
        summary = "Get measurements in time range"
        description = "Retrieves measurements from the database within a specified time range"
        operationId = "getMeasurementsInTimeRange"
        queries += Query.string().optional("startTime", "Start time in ISO format (default: 24 hours ago)")
        queries += Query.string().optional("endTime", "End time in ISO format (default: now)")
        returning(OK, measurementsListBodyLens to measurementsExample, "Successful response with measurements in time range")
        returning(BAD_REQUEST to "Error retrieving measurements in time range")
    } bindContract GET to handleGetMeasurementsInTimeRange

    private val avgTemperatureTimeRangeRoute = "/measurements/avgTemperature" meta {
        summary = "Get average temperature in time range"
        description = "Retrieves average temperature from the database within a specified time range"
        operationId = "getAvgTemperatureInTimeRange"
        queries += Query.string().optional("startTime", "Start time in ISO format (default: 24 hours ago)")
        queries += Query.string().optional("endTime", "End time in ISO format (default: now)")
        returning(OK, averageValueBodyLens to 25.5f, "Successful response with average temperature")
        returning(BAD_REQUEST to "Error retrieving average temperature in time range")
    } bindContract GET to handleGetAverageTemperatureInTimeRange

    private val avgHumidityTimeRangeRoute = "/measurements/avgHumidity" meta {
        summary = "Get average humidity in time range"
        description = "Retrieves average humidity from the database within a specified time range"
        operationId = "getAvgHumidityInTimeRange"
        queries += Query.string().optional("startTime", "Start time in ISO format (default: 24 hours ago)")
        queries += Query.string().optional("endTime", "End time in ISO format (default: now)")
        returning(OK, averageValueBodyLens to 60.2f, "Successful response with average humidity")
        returning(BAD_REQUEST to "Error retrieving average humidity in time range")
    } bindContract GET to handleGetAverageHumidityInTimeRange

    private val latestMeasurementsRoute = "/measurements/latest" meta {
        summary = "Get latest measurements by device"
        description = "Retrieves the latest measurement for each device"
        operationId = "getLatestMeasurementsByDevice"
        returning(OK, measurementsListBodyLens to measurementsExample, "Successful response with latest measurements by device")
        returning(BAD_REQUEST to "Error retrieving latest measurements by device")
    } bindContract GET to handleGetLatestMeasurementsByDevice

    private val measurementsRoomRoute = "/rooms/measurements" meta {
        summary = "Get latest measurements by device"
        description = "Retrieves measurement for the given room"
        operationId = "getMeasurementsForRoom"
        queries += Query.string().optional("room", "the room name to filter measurements by")
        queries += Query.string().optional("startTime", "Start time in ISO format")
        queries += Query.string().optional("endTime", "End time in ISO format (default: now)")
        returning(OK, measurementsListBodyLens to measurementsExample, "Successful response with measurements for room")
        returning(BAD_REQUEST to "Error retrieving measurements for room")
    } bindContract GET to handleGetAllMeasurementsForRoom

    private val roomRoute = "/rooms" meta {
        summary = "Get all rooms and their associated devices"
        description = "Retrieves all rooms from the database, including their associated devices"
        operationId = "getAllRooms"
        returning(OK, roomLens to roomsExample, "Successful response with all rooms")
        returning(BAD_REQUEST to "Error retrieving all rooms")
    } bindContract GET to handleGetRooms

    private val requestRoute = "/request" meta {
        summary = "Submit measurement data"
        description = "Submit temperature and/or humidity data from a device"
        operationId = "submitMeasurementData"
        receiving(request to TemperatureHumidityRequest(
            type = "TEMPERATURE_HUMIDITY",
            temperature = 25.0,
            humidity = 60.0,
            ipAddress = "192.168.0.0",
            deviceName = "Classroom Sensor"
        )
        )
        returning(OK to "Successful submission")
        returning(BAD_REQUEST to "Invalid request body")
    } bindContract POST to handleRequest

    val app: RoutingHttpHandler = routes(
        contract {
            renderer = OpenApi3(ApiInfo(title = "Tempmon API", version = "3.0.0"),
                servers = listOf(ApiServer(Uri.of("http://localhost:9247"))),
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
                measurementsRoomRoute,
                roomRoute,
            )
        },
        "/appApi.json" bind GET to handleOpenApiSpec,
        "/static/{path:.*}" bind static(Classpath("/web/static")),

        "/manifest.json" bind static(Classpath("/web")),
        "/favicon.ico" bind static(Classpath("/web")),
        "/logo192.png" bind static(Classpath("/web")),
        "/logo512.png" bind static(Classpath("/web")),
        "/robots.txt" bind static(Classpath("/web")),

        "/{path:.*}" bind GET to singlePageApp(Classpath("/web"))    )
}