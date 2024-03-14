import Foundation

func safeGet<T>(dict: [String: Any]?, key: String, errorMessage: String? = nil) throws -> T {
  let actualErrorMessage = errorMessage ?? "Could not safely get value for key (\(key)) from dict"

  if let value = dict?[key] as? T {
    return value
  } else {
    throw actualErrorMessage
  }
}
