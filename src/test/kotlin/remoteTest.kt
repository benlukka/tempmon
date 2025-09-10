import org.junit.jupiter.api.Test
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.http4k.client.OkHttp
import org.http4k.core.Request
import org.http4k.core.Method.POST
import org.http4k.core.Uri
import org.http4k.core.Status.Companion.OK
import org.http4k.server.Http4kServer
import org.http4k.server.Jetty
import org.http4k.server.asServer

class RemoteTest {
    private lateinit var server: Http4kServer

    @BeforeEach
    fun setup() {
        // Start the server before each test
        server = RequestApplication().app.asServer(Jetty(9000))
        server.start()
        println("[DEBUG_LOG] Server started on port 9000")
    }

    @AfterEach
    fun teardown() {
        // Stop the server after each test
        server.stop()
        println("[DEBUG_LOG] Server stopped")
    }

    @Test
    fun testWithCustomIpAndPort() {
        val ip = "localhost"
        val port = 9247
        val baseUrl = "http://$ip:$port"
        val client = OkHttp()
        val request = Request(POST, Uri.of("$baseUrl/request"))
            .header("Content-Type", "application/json")
            .body("""{"type":"TEMPERATURE","temperature":22}""")

        val response = client(request)
        println("[DEBUG_LOG] Response: ${response.status.code} - ${response.bodyString()}")

        // Add assertions
        assertEquals(OK, response.status)
        assertEquals("Received TemperatureRequest: Temp=22", response.bodyString())
    }
}
