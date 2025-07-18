import com.benlukka.HumidityRequest
import com.benlukka.Request
import com.benlukka.TemperatureHumidityRequest
import com.benlukka.TemperatureRequest
import org.http4k.core.Body
import org.http4k.format.Jackson.auto // Crucial import for Jackson.auto() extension function
import org.http4k.lens.BiDiBodyLens

/**
 * Provides a Body Lens for the polymorphic 'Request' interface.
 * This lens leverages Jackson's annotations (@JsonTypeInfo, @JsonSubTypes)
 * to automatically handle serialization and deserialization of the
 * 'Request' interface and its concrete subtypes.
 */
object RequestBodyLenses {
    // Corrected type definition for the lens
    val request: BiDiBodyLens<Request> = Body.auto<Request>().toLens()

    // Similarly for the specific subtypes if you needed them
    val temperatureHumidityRequest: BiDiBodyLens<TemperatureHumidityRequest> = Body.auto<TemperatureHumidityRequest>().toLens()
    val humidityRequest: BiDiBodyLens<HumidityRequest> = Body.auto<HumidityRequest>().toLens()
    val temperatureRequest: BiDiBodyLens<TemperatureRequest> = Body.auto<TemperatureRequest>().toLens()
}