import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Assertions.assertDoesNotThrow

class DatabaseExistsTest {

    @Test
    fun testDatabaseAlreadyExists() {
        val jooqProvider = JooqProvider()
        
        // First initialization should create the database
        println("[DEBUG_LOG] First initialization")
        jooqProvider.initializeDatabase()
        
        // Second initialization should handle the "database already exists" condition gracefully
        println("[DEBUG_LOG] Second initialization (database already exists)")
        assertDoesNotThrow {
            jooqProvider.initializeDatabase()
        }
        
        println("[DEBUG_LOG] Test completed successfully")
    }
}