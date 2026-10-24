using System;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Vexilla.Client
{
    public class EnvironmentConverter : JsonConverter<Environment>
    {
        public override Environment Read(ref Utf8JsonReader reader, Type type, JsonSerializerOptions options)
        {
            using (var document = JsonDocument.ParseValue(ref reader))
            {
                var value = Validation.Parse(document.RootElement.GetRawText(), Validation.Environment);
                return GroupConverter.ReadEnvironment(value);
            }
        }
        public override void Write(Utf8JsonWriter writer, Environment value, JsonSerializerOptions options)
        { throw new NotSupportedException("Serialize a complete Group with GroupConverter.Serialize"); }
    }
}
