import 'package:http/http.dart' as http;
import 'dart:convert';

const vexillaFeatureTypeToggle = 'toggle';
const vexillaFeatureTypeGradual = 'gradual';

/// The main class for dealing with Vexilla
class VexillaClient {
  final String _baseUrl, _environment, _customInstanceHash;

  Map? _flags;

  VexillaClient(this._environment, this._baseUrl, this._customInstanceHash);

  Future<Map?> fetchFlags(String fileName) async {
    var response = await http.get(Uri.parse('$_baseUrl/$fileName'));
    return jsonDecode(response.body);
  }

  void setFlags(Map? flags) {
    _flags = flags;
  }

  bool? should(String featureName) {
    var feature =
        _flags!['environments'][_environment]['untagged'][featureName];

    if (feature['type'] == vexillaFeatureTypeToggle) {
      return feature['value'];
    } else if (feature['type'] == vexillaFeatureTypeGradual) {
      return _hashInstanceId(feature['seed']) < feature['value'];
    } else {
      return false;
    }
  }

  int _hashInstanceId(double seed) {
    var total = _customInstanceHash.codeUnits
        .reduce((accumulator, value) => accumulator + value);

    return (total * seed * 42.0).floor() % 100;
  }
}
