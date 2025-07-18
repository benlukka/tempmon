import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertEquals
import org.jooq.DSLContext
import org.jooq.Record1
import org.jooq.Result
import org.jooq.impl.DSL
import java.sql.Connection

class JooqProviderTest {

    @Test
    fun testJooqProviderConnection() {
        val jooqProvider = JooqProvider()
        var connection: Connection? = null

        try {
            // Test creating a connection
            connection = jooqProvider.createConnection()
            assertNotNull(connection, "Connection should not be null")
            println("[DEBUG_LOG] Successfully created database connection")

            // Test creating a DSLContext
            val dslContext = jooqProvider.createDslContext(connection)
            assertNotNull(dslContext, "DSLContext should not be null")
            println("[DEBUG_LOG] Successfully created DSLContext")

            // Test executing a simple query
            val result = dslContext.select(DSL.one()).fetch()
            assertNotNull(result, "Query result should not be null")
            println("[DEBUG_LOG] Successfully executed a simple query: $result")

        } catch (e: Exception) {
            println("[DEBUG_LOG] Test failed: ${e.message}")
            println("[DEBUG_LOG] Make sure PostgreSQL is running on localhost:5432 with username/password: postgres/postgres")
            throw e
        } finally {
            // Clean up
            connection?.close()
            println("[DEBUG_LOG] Connection closed")
        }
    }

    @Test
    fun testJooqProviderWithDslContext() {
        val jooqProvider = JooqProvider()

        try {
            // Test the withDslContext utility method
            val result = jooqProvider.withDslContext { dsl ->
                println("[DEBUG_LOG] Executing query with withDslContext")
                dsl.select(DSL.one()).fetch()
            }
            assertNotNull(result, "Query result should not be null")
            println("[DEBUG_LOG] Successfully executed query with withDslContext: $result")

        } catch (e: Exception) {
            println("[DEBUG_LOG] Test failed: ${e.message}")
            println("[DEBUG_LOG] Make sure PostgreSQL is running on localhost:5432 with username/password: postgres/postgres")
            throw e
        }
    }

    @Test
    fun testSaveMeasurement() {
        val jooqProvider = JooqProvider()

        try {
            // Initialize the database to ensure the table exists
            jooqProvider.initializeDatabase()

            // Test saving a measurement with all fields
            val id = jooqProvider.saveMeasurement(
                temperature = 22.5f,
                humidity = 45.0f,
                ipAddress = "192.168.1.1",
                macAddress = "00:11:22:33:44:55",
                deviceName = "Test Device"
            )

            println("[DEBUG_LOG] Saved measurement with ID: $id")
            assert(id > 0) { "Saved measurement ID should be greater than 0" }

            // Verify the saved data
            jooqProvider.withDslContext { dsl ->
                val record = dsl.selectFrom("measurements")
                    .where(DSL.field("id").eq(id))
                    .fetchOne()

                assertNotNull(record, "Saved record should exist")
                assertEquals(22.5f, record?.get("temperature", Float::class.java))
                assertEquals(45.0f, record?.get("humidity", Float::class.java))
                assertEquals("192.168.1.1", record?.get("ip_address", String::class.java))
                assertEquals("00:11:22:33:44:55", record?.get("mac_address", String::class.java))
                assertEquals("Test Device", record?.get("device_name", String::class.java))

                println("[DEBUG_LOG] Successfully verified saved measurement data")
            }

        } catch (e: Exception) {
            println("[DEBUG_LOG] Test failed: ${e.message}")
            println("[DEBUG_LOG] Make sure PostgreSQL is running on localhost:5432 with username/password: postgres/postgres")
            throw e
        }
    }
}
