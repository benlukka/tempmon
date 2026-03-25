import com.fasterxml.jackson.annotation.JsonSubTypes
import com.fasterxml.jackson.annotation.JsonTypeInfo

/**
 * Defines the base interface for all request types, enabling polymorphic deserialization
 * with Jackson. The 'type' property is used to determine the concrete subtype.
 */
@JsonTypeInfo(
    use = JsonTypeInfo.Id.NAME,
    include = JsonTypeInfo.As.EXISTING_PROPERTY,
    property = "type",
    visible = true
)
@JsonSubTypes(
    // Map the "TEMPERATURE_HUMIDITY" type name to TemperatureHumidityRequest class
    JsonSubTypes.Type(value = TemperatureHumidityRequest::class, name = "TEMPERATURE_HUMIDITY"),
)
interface Request {
    /**
     * The 'type' property acts as the discriminator for Jackson to identify the correct subtype.
     * Each concrete implementation must provide a value for this property.
     */
    val type: String
}

data class TemperatureHumidityRequest(
    override val type: String = "TEMPERATURE_HUMIDITY",
    val temperature: Double? = null,
    val humidity: Double? = null,
    val macAddress: String? = null,
    val deviceName: String? = null
) : Request
