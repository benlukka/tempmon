package com.benlukka

import java.net.InetAddress
import java.net.NetworkInterface
import javax.jmdns.JmDNS
import javax.jmdns.ServiceInfo

object MdnsAdvertiser: Thread() {

    /**
     * Gets the actual network interface IP address (not localhost)
     */
    private fun getNetworkInterfaceAddress(): InetAddress? {
        try {
            val interfaces = NetworkInterface.getNetworkInterfaces()
            while (interfaces.hasMoreElements()) {
                val networkInterface = interfaces.nextElement()

                // Skip loopback and inactive interfaces
                if (networkInterface.isLoopback || !networkInterface.isUp) {
                    continue
                }

                val addresses = networkInterface.inetAddresses
                while (addresses.hasMoreElements()) {
                    val address = addresses.nextElement()

                    // Look for IPv4 addresses that are not loopback
                    if (!address.isLoopbackAddress &&
                        !address.isLinkLocalAddress &&
                        address.isSiteLocalAddress &&
                        address.hostAddress.contains(".")) {

                        println("Using network interface: ${networkInterface.name} -> ${address.hostAddress}")
                        return address
                    }
                }
            }
        } catch (e: Exception) {
            println("Error getting network interface: ${e.message}")
        }

        return null
    }

    override fun start() {
        try {
            // Use the actual network interface instead of localhost
            val addr = getNetworkInterfaceAddress()
            if (addr == null) {
                println("Error: Could not find suitable network interface for mDNS advertising")
                return
            }

            println("Advertising mDNS service on: ${addr.hostAddress}")

            val jmdns = JmDNS.create(addr)
            val serviceType = "_http._tcp.local."
            val serviceName = "TempMon"
            val servicePort = port // Make sure 'port' is defined somewhere

            val txtRecord = mapOf(
                "version" to "1.0",
                "status" to "active"
            )

            // ServiceInfo-Objekt erstellen
            val serviceInfo = ServiceInfo.create(
                serviceType,
                serviceName,
                servicePort,
                0,
                0,
                txtRecord
            )

            // Dienst veröffentlichen
            jmdns.registerService(serviceInfo)

            println("TempMon mDNS-Dienst auf Port $servicePort veröffentlicht (${addr.hostAddress})")

            Runtime.getRuntime().addShutdownHook(Thread {
                println("Beende TempMon-Dienst...")
                try {
                    jmdns.unregisterAllServices()
                    jmdns.close()
                } catch (e: Exception) {
                    println("Error during shutdown: ${e.message}")
                }
            })

            while (!isInterrupted) {
                sleep(10_000)
            }

        } catch (e: Exception) {
            println("Error in MdnsAdvertiser: ${e.message}")
            e.printStackTrace()
        }
    }

    /**
     * Alternative method to start advertising on a specific address
     */
    fun startOnAddress(address: InetAddress, servicePort: Int) {
        try {
            println("Advertising mDNS service on: ${address.hostAddress}")

            val jmdns = JmDNS.create(address)
            val serviceType = "_http._tcp.local."
            val serviceName = "TempMon"

            val txtRecord = mapOf(
                "version" to "1.0",
                "status" to "active"
            )

            val serviceInfo = ServiceInfo.create(
                serviceType,
                serviceName,
                servicePort,
                0,
                0,
                txtRecord
            )

            jmdns.registerService(serviceInfo)

            println("TempMon mDNS-Dienst auf Port $servicePort veröffentlicht (${address.hostAddress})")

            Runtime.getRuntime().addShutdownHook(Thread {
                println("Beende TempMon-Dienst...")
                try {
                    jmdns.unregisterAllServices()
                    jmdns.close()
                } catch (e: Exception) {
                    println("Error during shutdown: ${e.message}")
                }
            })

        } catch (e: Exception) {
            println("Error in MdnsAdvertiser: ${e.message}")
            e.printStackTrace()
        }
    }
}