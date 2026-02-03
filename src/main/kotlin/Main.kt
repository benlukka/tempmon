import org.http4k.server.Jetty
import org.http4k.server.asServer

val port = System.getenv()["API_PORT"] ?: 9247
fun main() {
    OtaDeviceDiscoveryService.start()
    try {
        println("Starting HTTP server...")
        RequestApplication().app.asServer(Jetty(port as Int)).start()
        println("Server started on port $port")
    } catch (e: Exception) {
        println("Error starting HTTP server: ${e.message}")
        e.printStackTrace()
    }
    try {
        println("Starting mDNS advertiser...")
        MdnsAdvertiser.start()
        println("mDNS advertiser started")
    } catch (e: Exception) {
        println("Error starting mDNS advertiser: ${e.message}")
        e.printStackTrace()
    }
}