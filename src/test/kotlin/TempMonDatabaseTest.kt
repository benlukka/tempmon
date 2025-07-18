import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Assertions.assertNotNull
import org.jooq.impl.DSL
import java.sql.Connection
import java.sql.SQLException

class TempMonDatabaseTest {

    @Test
    fun testDatabaseInitialization() {
        val jooqProvider = JooqProvider()

        try {
            // Initialize the database
            jooqProvider.initializeDatabase()
            println("[DEBUG_LOG] Database initialized successfully")

            // Connect to the TempMon database
            var connection: Connection? = null
            try {
                connection = jooqProvider.createConnection()
                assertNotNull(connection, "Connection to TempMon database should not be null")
                println("[DEBUG_LOG] Successfully connected to TempMon database")

                // Check if the measurements table exists
                val dslContext = jooqProvider.createDslContext(connection)
                val result = dslContext
                    .select(DSL.field("table_name"))
                    .from(DSL.table("information_schema.tables"))
                    .where(DSL.field("table_schema").eq("public")
                        .and(DSL.field("table_name").eq("measurements")))
                    .fetch()

                assertTrue(result.isNotEmpty(), "Measurements table should exist")
                println("[DEBUG_LOG] Measurements table exists")

                // Check the structure of the measurements table
                val columns = dslContext
                    .select(DSL.field("column_name"), DSL.field("data_type"))
                    .from(DSL.table("information_schema.columns"))
                    .where(DSL.field("table_schema").eq("public")
                        .and(DSL.field("table_name").eq("measurements")))
                    .fetch()

                println("[DEBUG_LOG] Table structure:")
                columns.forEach { record ->
                    println("[DEBUG_LOG] Column: ${record.get(0)} (${record.get(1)})")
                }

                // Verify that the required columns exist
                val columnNames = columns.map { it.get(0, String::class.java) }
                assertTrue(columnNames.contains("id"), "Table should have an id column")
                assertTrue(columnNames.contains("timestamp"), "Table should have a timestamp column")
                assertTrue(columnNames.contains("temperature"), "Table should have a temperature column")
                assertTrue(columnNames.contains("humidity"), "Table should have a humidity column")

                // Insert a test record
                dslContext.execute("INSERT INTO measurements (temperature, humidity) VALUES (22.5, 45.0)")
                println("[DEBUG_LOG] Test record inserted")

                // Verify that the record was inserted
                val countRecord = dslContext
                    .selectCount()
                    .from(DSL.table("measurements"))
                    .fetchOne()

                val count = countRecord?.get(0, Long::class.java) ?: 0
                assertTrue(count > 0, "Table should contain at least one record")
                println("[DEBUG_LOG] Table contains $count records")

            } finally {
                connection?.close()
                println("[DEBUG_LOG] Connection closed")
            }

        } catch (e: SQLException) {
            println("[DEBUG_LOG] Test failed: ${e.message}")
            throw e
        }
    }
}
