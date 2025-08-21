import org.http4k.core.Body
import org.http4k.format.Jackson.auto
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

}