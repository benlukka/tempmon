import com.benlukka.jooq.tables.references.MEASUREMENTS
import org.jooq.*
import org.jooq.impl.DSL
import java.sql.Connection
import java.sql.DriverManager
import java.sql.SQLException
import java.sql.Statement
import java.time.LocalDateTime
/**
 * Provides a jOOQ DSLContext for database operations.
 * This implementation connects to a PostgreSQL database on localhost
 * with the username and password "postgres".
 */
class JooqProvider {
    companion object {
        private const val JDBC_URL = "jdbc:postgresql://localhost:5432/"
        private const val JDBC_URL_WITH_DB = "jdbc:postgresql://localhost:5432/TempMon"
        private val USERNAME = System.getenv()["POSTGRES_USER"] ?: "postgres"
        private val PASSWORD = System.getenv()["POSTGRES_PASSWORD"] ?: "postgres"
        private val DB_NAME = System.getenv()["POSTGRES_DB"] ?: "TempMon"

        // SQL to create the measurements table if it doesn't exist
        private const val CREATE_TABLE_SQL = """
            CREATE TABLE IF NOT EXISTS measurements (
                id SERIAL PRIMARY KEY,
                timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                temperature FLOAT,
                humidity FLOAT,
                ip_address VARCHAR(45),
                mac_address VARCHAR(17),
                device_name VARCHAR(255)
            )
        """
    }

    /**
     * Initializes the TempMon database and creates the measurements table if they don't exist.
     */
    fun initializeDatabase() {
        // First, connect to the default PostgreSQL database to create the TempMon database if it doesn't exist
        var connection: Connection? = null
        var statement: Statement? = null

        try {
            connection = DriverManager.getConnection(JDBC_URL, USERNAME, PASSWORD)
            statement = connection.createStatement()

            // Check if the database exists
            val resultSet = statement.executeQuery(
                "SELECT 1 FROM pg_database WHERE datname = '${DB_NAME.lowercase()}'"
            )

            if (!resultSet.next()) {
                // Database doesn't exist, create it
                statement.execute("CREATE DATABASE \"$DB_NAME\"")
                println("Database $DB_NAME created successfully")
            } else {
                println("Database $DB_NAME already exists")
            }
        } catch (e: SQLException) {
            // PostgreSQL error code 42P04 means "database already exists"
            // If this is the error, we can safely continue
            if (e.sqlState == "42P04") {
                println("Database $DB_NAME already exists (from exception handler)")
            } else {
                println("Error initializing database: ${e.message}")
                throw e
            }
        } finally {
            statement?.close()
            connection?.close()
        }

        // Now connect to the TempMon database and create the measurements table if it doesn't exist
        try {
            withDslContext { dsl ->
                dsl.execute(CREATE_TABLE_SQL)
                println("Measurements table created or already exists")

                // Check if the new columns exist, and add them if they don't
                try {
                    // Try to add ip_address column if it doesn't exist
                    dsl.execute("ALTER TABLE measurements ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45)")
                    println("Added ip_address column or it already exists")

                    // Try to add mac_address column if it doesn't exist
                    dsl.execute("ALTER TABLE measurements ADD COLUMN IF NOT EXISTS mac_address VARCHAR(17)")
                    println("Added mac_address column or it already exists")

                    // Try to add device_name column if it doesn't exist
                    dsl.execute("ALTER TABLE measurements ADD COLUMN IF NOT EXISTS device_name VARCHAR(255)")
                    println("Added device_name column or it already exists")
                } catch (e: SQLException) {
                    println("Warning: Error adding new columns: ${e.message}")
                }
            }
        } catch (e: SQLException) {
            // Log the error but don't throw it - allow the application to continue
            println("Warning: Error creating measurements table: ${e.message}")
            println("The application will continue, but database functionality may be limited")
        }
    }

    /**
     * Creates a new JDBC connection to the TempMon database.
     * 
     * @return A new Connection object
     */
    fun createConnection(): Connection {
        return DriverManager.getConnection(JDBC_URL_WITH_DB, USERNAME, PASSWORD)
    }

    /**
     * Creates a new DSLContext for jOOQ operations using an existing connection.
     * 
     * @param connection An existing JDBC connection
     * @return A new DSLContext object
     */
    fun createDslContext(connection: Connection): DSLContext {
        return DSL.using(connection, SQLDialect.POSTGRES)
    }

    /**
     * Executes the given function with a DSLContext and automatically closes the connection.
     * 
     * @param block The function to execute with the DSLContext
     * @return The result of the function
     */
    fun <T> withDslContext(block: (DSLContext) -> T): T {
        val connection = createConnection()
        connection.use { connection ->
            val dslContext = createDslContext(connection)
            return block(dslContext)
        }
    }

    /**
     * Saves a measurement to the database.
     * 
     * @param temperature The temperature value (can be null)
     * @param humidity The humidity value (can be null)
     * @param ipAddress The client's IP address (can be null)
     * @param macAddress The client's MAC address (can be null)
     * @param deviceName The client's device name (can be null)
     * @return The ID of the inserted record
     */
    fun saveMeasurement(
        temperature: Double? = null,
        humidity: Double? = null,
        ipAddress: String? = null,
        macAddress: String? = null,
        deviceName: String? = null
    ): Int {
        return withDslContext { dsl ->
            dsl.insertInto(
               MEASUREMENTS,
                MEASUREMENTS.TEMPERATURE,
                MEASUREMENTS.HUMIDITY,
                MEASUREMENTS.IP_ADDRESS,
                MEASUREMENTS.MAC_ADDRESS,
                MEASUREMENTS.DEVICE_NAME,
            )
                .values(
                    temperature,
                    humidity,
                    ipAddress,
                    macAddress,
                    deviceName
                )
            .returningResult(MEASUREMENTS.ID)
            .fetchOne()
            ?.getValue(MEASUREMENTS.ID) ?: -1
        }
    }

    /**
     * Data class representing a measurement from the database
     */
    data class Measurement(
        val id: Int,
        val timestamp: LocalDateTime,
        val temperature: Float?,
        val humidity: Float?,
        val ipAddress: String?,
        val macAddress: String?,
        val deviceName: String?
    )

    data class Device(
        val macAddress: String,
        val name: String
    )

    data class Room(
        val devices: List<Device>,
        val name: String
    )
    private fun Record.toMeasurement(): Measurement {
        return Measurement(
            id = this.get(MEASUREMENTS.ID) ?: -1,
            timestamp = this.get(MEASUREMENTS.TIMESTAMP) ?: LocalDateTime.now(),
            temperature = this.get(MEASUREMENTS.TEMPERATURE)?.toFloat(),
            humidity = this.get(MEASUREMENTS.HUMIDITY)?.toFloat(),
            ipAddress = this.get(MEASUREMENTS.IP_ADDRESS),
            macAddress = this.get(MEASUREMENTS.MAC_ADDRESS),
            deviceName = this.get(MEASUREMENTS.DEVICE_NAME)
        )
    }
    /**
     * Retrieves all measurements from the database
     * 
     * @param limit The maximum number of measurements to retrieve (default: 100)
     * @param offset The offset to start retrieving measurements from (default: 0)
     * @return A list of Measurement objects
     */
    fun getAllMeasurements(limit: Int = 100, offset: Int = 0): List<Measurement> {
        return withDslContext { dsl ->
            dsl.select()
                .from(MEASUREMENTS)
                .orderBy(MEASUREMENTS.TIMESTAMP.desc())
                .limit(limit)
                .offset(offset)
                .fetch()
                .let { records -> records.map { record -> record.toMeasurement()} }
        }
    }
    fun getCountOfMeasurements(): Int {
        return withDslContext { dsl ->
            dsl.selectCount()
                .from(MEASUREMENTS)
                .fetchOne()
                ?.value1() ?: 0
        }
    }
    fun getMeasurementsByMacAddress(macAddress: String, limit: Int = 100, offset: Int = 0): List<Measurement> {
        return withDslContext { dsl ->
            dsl.select()
                .from(MEASUREMENTS)
                .where(MEASUREMENTS.MAC_ADDRESS.eq(macAddress))
                .orderBy(MEASUREMENTS.TIMESTAMP.desc())
                .limit(limit)
                .offset(offset)
                .fetch()
                .let { records -> records.map { record -> record.toMeasurement()} }
        }
    }
    fun getMeasurementsByRoom(room: String, limit: Int = 100, offset: Int = 0): List<Measurement> {
        return withDslContext { dsl ->
            dsl.select()
                .from(MEASUREMENTS)
                .where(MEASUREMENTS.DEVICE_NAME.eq(room))
                .orderBy(MEASUREMENTS.TIMESTAMP.desc())
                .limit(limit)
                .offset(offset)
                .fetch()
                .let { records -> records.map { record -> record.toMeasurement()} }
        }
    }
    fun getAllDevices(limit: Int = 100, offset: Int = 0): List<Device> {
        return withDslContext { dsl ->
            dsl.select(MEASUREMENTS.MAC_ADDRESS, MEASUREMENTS.DEVICE_NAME)
                .from(MEASUREMENTS)
                .groupBy(MEASUREMENTS.MAC_ADDRESS, MEASUREMENTS.DEVICE_NAME) // Or use distinct on
                .orderBy(MEASUREMENTS.MAC_ADDRESS)
                .limit(limit)
                .offset(offset)
                .fetch()
                .map { record ->
                    Device(
                        macAddress = record.get(MEASUREMENTS.MAC_ADDRESS) ?: "",
                        name = record.get(MEASUREMENTS.DEVICE_NAME) ?: ""
                    )
                }
        }
    }

    fun getAllRooms(limit: Int = 100, offset: Int = 0): List<Room> {
        return withDslContext { dsl ->
            dsl.selectDistinct(MEASUREMENTS.DEVICE_NAME)
                .from(MEASUREMENTS)
                .limit(limit)
                .offset(offset)
                .fetch()
                .map { record ->
                    val deviceName = record.get(MEASUREMENTS.DEVICE_NAME) ?: "Unknown Room"
                    val devices = getAllDevices().filter { it.name == deviceName }
                    Room(devices = devices, name = deviceName)
                }
        }
    }
    fun getAverageTemperature(
        startTime: LocalDateTime = LocalDateTime.now().minusDays(1), // Default to last 24 hours
        endTime: LocalDateTime = LocalDateTime.now()
    ): Float? {
        return withDslContext { dsl ->
            val timestampField = MEASUREMENTS.TIMESTAMP // Assuming 'timestamp' column
            val temperatureField = MEASUREMENTS.TEMPERATURE

            dsl.select(DSL.avg(temperatureField).`as`("avg_temp"))
                .from(MEASUREMENTS)
                .where(timestampField.ge(startTime)) // Greater than or equal to start time
                .and(timestampField.le(endTime))    // Less than or equal to end time
                .fetchOne()
                ?.getValue("avg_temp", Double::class.java)
                ?.toFloat()
        }
    }

    fun getAverageHumidity(
        startTime: LocalDateTime = LocalDateTime.now().minusDays(1),
        endTime: LocalDateTime = LocalDateTime.now()
    ): Float? {
        return withDslContext { dsl ->
            val timestampField = MEASUREMENTS.TIMESTAMP // Assuming 'timestamp' column
            val humidityField = MEASUREMENTS.HUMIDITY // *** Corrected to humidity field ***

            dsl.select(DSL.avg(humidityField).`as`("avg_humidity")) // *** Corrected alias ***
                .from(MEASUREMENTS)
                .where(timestampField.ge(startTime)) // Greater than or equal to start time
                .and(timestampField.le(endTime))    // Less than or equal to end time
                .fetchOne()
                ?.getValue("avg_humidity", Double::class.java) // *** Corrected to humidity alias ***
                ?.toFloat()
        }
    }
    /**
     * Retrieves measurements from the database within a specified time range
     * 
     * @param startTime The start time of the range (default: 24 hours ago)
     * @param endTime The end time of the range (default: now)
     * @return A list of Measurement objects
     */
    fun getMeasurementsInTimeRange(
        startTime: LocalDateTime = LocalDateTime.now().minusDays(1),
        endTime: LocalDateTime = LocalDateTime.now()
    ): List<Measurement> {
        return withDslContext { dsl ->
            dsl.select()
                .from(MEASUREMENTS)
                .where(MEASUREMENTS.TIMESTAMP.ge(startTime))
                .and(MEASUREMENTS.TIMESTAMP.le(endTime))
                .orderBy(MEASUREMENTS.TIMESTAMP.asc())
                .fetch()
                .let { records -> records.map { record -> record.toMeasurement()} }
                }
        }

    /**
     * Retrieves the latest measurement for each device
     * 
     * @return A list of Measurement objects
     */
    fun getLatestMeasurementsByDevice(): List<Measurement> {
        return withDslContext { dsl ->
            // This query uses a subquery to get the latest timestamp for each device
            val subquery = dsl.select(
                MEASUREMENTS.DEVICE_NAME,
                DSL.max(MEASUREMENTS.TIMESTAMP).`as`("max_timestamp")
            )
                .from(MEASUREMENTS)
                .where(MEASUREMENTS.DEVICE_NAME.isNotNull)
                .groupBy(MEASUREMENTS.DEVICE_NAME)
                .asTable("latest_timestamps")

            dsl.select()
                .from(MEASUREMENTS)
                .join(subquery)
                .on(
                    DSL.field("measurements.device_name").eq(DSL.field("latest_timestamps.device_name"))
                        .and(DSL.field("measurements.timestamp").eq(DSL.field("latest_timestamps.max_timestamp")))
                )
                .fetch()
                .let { records -> records.map { record -> record.toMeasurement()} }
        }
    }
}
