# Vexilla

This is the monorepo for the Vexilla feature flag system.

## Dependencies

This project requires the following dependencies:

- [pnpm](https://pnpm.io/) version 8.5 or higher
- [Node.js](https://nodejs.org/) version 20.x or higher (LTS version recommended)

## Getting Started with Development

Thank you for wanting to contribute, just follow the steps below

1. **Clone the Repository**: Clone this repository to your local machine using Git, and navigate to the project directory

2. **Install Dependencies**: Use `pnpm install` to install project dependencies. For other `pnpm` commands, navigate to specific apps in this monorepo. For example, to run build or development scripts, use `pnpm run dev` from the app's directory

### Developing on Apple Silicon

If you're using Apple Silicon, you may need to take additional steps to ensure compatibility.

<details>
<summary>Follow Instructions</summary>

1. **Install GCC**: The "libvps" dependency relies on gcc. To install gcc from source, use Homebrew:

   ```bash
   brew install --build-from-source gcc
   ```

2. **Install Xcode Command Line Tools**: These tools are also required for "libvps". If not installed, you can install them with:

   ```bash
   xcode-select --install
   ```

3. **Install "vips"**: This is another dependency needed for the project. Install it via Homebrew:

   ```bash
   brew install vips
   ```

</details>

## License

Current Vexilla code is released under a combination of two licenses, the Business Source License (BSL) and the MIT License.

Please see the [License file](./LICENSE) for more info.
