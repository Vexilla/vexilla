import http.client
import urllib.request
import json
import enum

from .hasher import Hasher

class VexillaFeatureType(enum.Enum):
  toggle = "toggle"
  gradual = "gradual"
  selective = "selective"

class VexillaClient:

  def __init__(self, base_url, environment, custom_instance_hash):
    super().__init__()
    self.__base_url = base_url
    self.__environment = environment
    self.__custom_instance_hash = custom_instance_hash

  def fetch_flags(self, file_name):
    response = urllib.request.urlopen(f'{self.__base_url}/{file_name}.json')

    json_response = json.loads(response.read())
    self.__flags = json_response["environments"][self.__environment]
    print(self.__flags)


    return self

  def should(self, feature_name):
    # feature groups are not yet implemented. default to "untagged"
    feature = self.__flags["untagged"][feature_name]

    if VexillaFeatureType(feature["type"]) == VexillaFeatureType.toggle:
      return feature["value"]
    elif VexillaFeatureType(feature["type"]) == VexillaFeatureType.gradual:
      return Hasher(feature["seed"]).hashString(self.__custom_instance_hash) <= feature["value"]
    else:
      return False
