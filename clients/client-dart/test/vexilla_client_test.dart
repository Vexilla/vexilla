import 'package:vexilla_client/vexilla_client.dart';
import 'package:test/test.dart';

void main() {
  group('A group of tests', () {
    test('First Test', () async {
      var client = VexillaClient(
          'dev',
          'https://streamparrot-feature-flags.s3.amazonaws.com',
          'b7e91cc5-ec76-4ec3-9c1c-075032a13a1a');

      var flags = await client.fetchFlags('features.json');

      client.setFlags(flags);

      var shouldGradual = client.should('testingWorkingGradual');
      var shouldNotGradual = client.should('testingNonWorkingGradual');

      expect(shouldGradual, isTrue);
      expect(shouldNotGradual, isFalse);
    });
  });
}
