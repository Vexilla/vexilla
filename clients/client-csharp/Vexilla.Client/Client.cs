using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace Vexilla.Client
{

    public static class VexillaFeatureTypes
    {
        public const string TOGGLE = "toggle";
        public const string GRADUAL = "gradual";
    }

    public class VexillaFlags
    {
        public Dictionary<string, Dictionary<string, Dictionary<string, JObject>>> environments { get; set; }
    }

    public class VexillaClientBase
    {
        protected string baseUrl;
        protected string environment;
        protected string customInstanceHash;

        protected JObject flags;

        public VexillaClientBase(string baseUrl, string environment, string customInstanceHash)
        {
            this.baseUrl = baseUrl;
            this.environment = environment;
            this.customInstanceHash = customInstanceHash;
        }

        public virtual async Task<string> FetchString(Func<string, string, Task<string>> finishedCallback)
        {

            //var result = await finishedCallback(baseUrl, fileName);
            var client = new HttpClient();
            var result = await client.GetAsync(baseUrl + "/features.json");
            var content = await result.Content.ReadAsStringAsync();
            return content;
        }


        public virtual async Task<JObject> FetchFlags(string fileName, HttpClient httpClient)
        {
            var result = await httpClient.GetAsync(
               baseUrl + "/" + fileName
            );
            var content = await result.Content.ReadAsStringAsync();
            var config = JObject.Parse(content);

            return config;
        }

        public virtual async Task<JObject> FetchFlags(string fileName, Func<string, string, Task<JObject>> finishedCallback)
        {
            // fetch json
            var result = await finishedCallback(baseUrl, fileName);
            return result;
        }

        public virtual void setFlags(JObject flags)
        {
            this.flags = flags;
        }

        public virtual bool should(string featureName) {

            JObject environments = flags.GetValue("environments").Value<JObject>();
            JObject environment = environments.GetValue(this.environment).Value<JObject>();
            JObject featureSet = environment.GetValue("untagged").Value<JObject>();
            JObject feature = featureSet.GetValue(featureName).Value<JObject>();

            string featureType = feature.GetValue("type").Value<string>();

            if(featureType == VexillaFeatureTypes.TOGGLE)
            {
                return feature.GetValue("value").Value<bool>();
            } else if(featureType == VexillaFeatureTypes.GRADUAL)
            {
                int value = feature.GetValue("value").Value<int>();
                float seed = feature.GetValue("seed").Value<float>();
                var hasher = new VexillaHasher(seed);

                return hasher.hashString(customInstanceHash) < value;
            }

            return false;
        }
    }
}

