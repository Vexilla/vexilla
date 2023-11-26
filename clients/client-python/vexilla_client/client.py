from typing import Dict
import json

from .hasher import Hasher
from .types import Group, Manifest, VexillaFeatureType

class VexillaClient:
  __manifest: Manifest
  __flag_groups: Dict[str, Group] = {}

  __group_lookup_table: Dict[str, str] = {}
  __environment_lookup_table: Dict[str, Dict[str, str]] = {}
  __feature_lookup_table: Dict[str, Dict[str, str]] = {}

  def __init__(self, base_url: str, environment: str, custom_instance_hash: str, show_logs: bool = False):
    super().__init__()
    self.__base_url = base_url
    self.__environment = environment
    self.__custom_instance_hash = custom_instance_hash
    self.__show_logs = show_logs



  # def should(self, feature_name):
  #   # feature groups are not yet implemented. default to "untagged"
  #   feature = self.__flags["untagged"][feature_name]

  #   if VexillaFeatureType(feature["type"]) == VexillaFeatureType.toggle:
  #     return feature["value"]
  #   elif VexillaFeatureType(feature["type"]) == VexillaFeatureType.gradual:
  #     return Hasher(feature["seed"]).hashString(self.__custom_instance_hash) <= feature["value"]
  #   else:
  #     return False
