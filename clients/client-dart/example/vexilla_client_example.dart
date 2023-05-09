import 'package:vexilla_client/vexilla_client.dart';

void main() async {
  var client = VexillaClient(
      'dev',
      'https://BUCKET_NAME.s3-website-AWS_REGION.amazonaws.com',
      'b7e91cc5-ec76-4ec3-9c1c-075032a13a1a');

  var flags = await client.fetchFlags('features.json');

  client.setFlags(flags);

  if (client.should('FEATURE_NAME')!) {
    print('User should be able to use a feature.');
  }
  ;
}
