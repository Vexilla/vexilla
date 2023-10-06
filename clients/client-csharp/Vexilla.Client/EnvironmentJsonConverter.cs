using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Vexilla.Client
{
    public class EnvironmentConverter : JsonConverter<Environment>
    {
        public override Environment Read(
            ref Utf8JsonReader reader,
            Type typeToConvert,
            JsonSerializerOptions options)
        {
            var newEnvironment = new Environment
            {
                Name = string.Empty,
                EnvironmentId = string.Empty,

                RawFeatures = new Dictionary<string, Feature>(),

                ToggleFeatures = new Dictionary<string, ToggleFeature>(),
                GradualFeatures = new Dictionary<string, GradualFeature>(),

                SelectiveFeatures = new Dictionary<string, SelectiveFeature>(),
                SelectiveStringFeatures =
                    new Dictionary<string, SelectiveStringFeature>(),
                SelectiveIntFeatures =
                    new Dictionary<string, SelectiveIntFeature>(),
                SelectiveFloatFeatures =
                    new Dictionary<string, SelectiveFloatFeature>(),

                ValueFeatures = new Dictionary<string, ValueFeature>(),
                ValueStringFeatures =
                    new Dictionary<string, ValueStringFeature>(),
                ValueIntFeatures = new Dictionary<string, ValueIntFeature>(),
                ValueFloatFeatures = new Dictionary<string, ValueFloatFeature>()
            };

            Feature currentFeature = null;
            ToggleFeature currentToggleFeature = null;
            GradualFeature currentGradualFeature = null;
            SelectiveFeature currentSelectiveFeature = null;
            SelectiveStringFeature currentSelectiveStringFeature = null;
            SelectiveIntFeature currentSelectiveIntFeature = null;
            SelectiveFloatFeature currentSelectiveFloatFeature = null;
            ValueFeature currentValueFeature = null;
            ValueStringFeature currentValueStringFeature = null;
            ValueIntFeature currentValueIntFeature = null;
            ValueFloatFeature currentValueFloatFeature = null;

            var currentFeatureType = string.Empty;

            while (reader.Read())
            {
                if (reader.TokenType == JsonTokenType.PropertyName)
                {
                    switch (reader.GetString())
                    {
                        case "name":
                            reader.Read();
                            newEnvironment.Name = reader.GetString();
                            break;
                        case "environmentId":
                            reader.Read();
                            newEnvironment.EnvironmentId = reader.GetString();
                            break;
                        case "features":
                            while (reader.Read())
                            {
                                var currentTokenType = reader.TokenType;
                                if (currentTokenType ==
                                    JsonTokenType.PropertyName)
                                {
                                    currentFeature = new Feature();

                                    while (reader.Read())
                                    {
                                        currentTokenType = reader.TokenType;
                                        if (currentTokenType ==
                                            JsonTokenType.EndObject)
                                        {
                                            break;
                                        }

                                        if (currentTokenType ==
                                            JsonTokenType.PropertyName)
                                        {
                                            var propertyName =
                                                reader.GetString();
                                            if (propertyName == "schedule")
                                            {
                                                // handle schedule parsing
                                            } else
                                            {
                                                if (propertyName == "name")
                                                {
                                                    // go to value
                                                    reader.Read();
                                                    currentFeature.Name =
                                                        reader.GetString();
                                                } else if (propertyName ==
                                                 "featureId")
                                                {
                                                    reader.Read();
                                                    currentFeature.FeatureId =
                                                        reader.GetString();
                                                } else if (propertyName ==
                                                 "featureType")
                                                {
                                                    reader.Read();
                                                    var featureType =
                                                        reader.GetString();
                                                    if (featureType ==
                                                     FeatureType.Toggle)
                                                    {
                                                        currentFeature
                                                                .FeatureType =
                                                            FeatureType.Toggle;
                                                    }

                                                    if (featureType ==
                                                     FeatureType.Gradual)
                                                    {
                                                        currentFeature
                                                                .FeatureType =
                                                            FeatureType.Gradual;
                                                    }

                                                    if (featureType ==
                                                     FeatureType.Selective)
                                                    {
                                                        currentFeature
                                                                .FeatureType =
                                                            FeatureType
                                                                .Selective;
                                                    }

                                                    if (featureType ==
                                                     FeatureType.Value)
                                                    {
                                                        currentFeature
                                                                .FeatureType =
                                                            FeatureType.Value;
                                                    }
                                                }
                                            }
                                        }
                                    }
                                } else if (currentTokenType ==
                                           JsonTokenType.EndObject)
                                {
                                    break;
                                }
                            }

                            break;
                    }
                }
            }

            return newEnvironment;
        }

        public override void Write(Utf8JsonWriter writer, Environment value,
            JsonSerializerOptions options)
        {
            throw new NotImplementedException();
        }
    }
}