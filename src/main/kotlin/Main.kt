import org.http4k.server.Jetty
import org.http4k.server.asServer
import java.lang.Thread.sleep

val port = System.getenv()["API_PORT"] ?: 9247
fun main() {
    Thread {
        try {
            sleep(10000) // wait for the database to be ready
            println("Initializing TempMon database...")
            JooqProvider.initializeDatabase()
            println("Database initialization completed successfully")
        } catch (e: Exception) {
            println("Error initializing database: ${e.message}")
            e.printStackTrace()
        }
    }.start()
    Thread{
        try {
            println("Starting HTTP server...")
            RequestApplication().app.asServer(Jetty(port as Int)).start()
            println("Server started on port $port")
        } catch (e: Exception) {
            println("Error starting HTTP server: ${e.message}")
            e.printStackTrace()
        }
    }.start()
    try {
        println("Starting mDNS advertiser...")
        MdnsAdvertiser.start()
        println("mDNS advertiser started")
    } catch (e: Exception) {
        println("Error starting mDNS advertiser: ${e.message}")
        e.printStackTrace()
    }

}