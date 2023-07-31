export function logProxy(label: string, proxy: Object) {
  try {
    console.log(label, JSON.parse(JSON.stringify(proxy)));
  } catch (e) {
    console.log("Unable to log proxy", label);
  }
}
