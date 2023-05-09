# Vexilla CLI

This tool is meant to encompass any of the boilerplate and tasks that go along with using the Vexilla Feature Flag System.

## Scope

Currently this tool is only meant to generate consts/enums for feature flag keys and groups from your own Vexilla-created json file. The goal is to reduce the amount of "magic strings" in your code.

## Usage

The easiest way to use this tool is via NPM:

```
npx @vexilla/cli npx @vexilla/cli types -i https://mealection-feature-flags.s3.us-east-1.amazonaws.com/features.json -o ./temp/foo.dart -l dart
```

You can also download a binary for your platform from: [https://github.com/Vexilla/cli/releases](https://github.com/Vexilla/cli/releases)

## License

Copyright 2022 Whirligig Labs LLC

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
