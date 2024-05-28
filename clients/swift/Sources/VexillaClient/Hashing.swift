import Foundation

struct FNVConstants {
  static let FNV32_OFFSET_BASIS: UInt32 = 2166136261;
  static let FNV32_PRIME: UInt32 = 16777619;
}


func hashString(stringToHash: String, seed: Float64) -> Float64 {
  var hashResult = FNVConstants.FNV32_OFFSET_BASIS
  for char in stringToHash.utf8 {
    hashResult ^= UInt32(char)
    hashResult &*= FNVConstants.FNV32_PRIME
  }

  let seeded = Float64(hashResult) * seed
  // seeded.round(.down)
  let modded = seeded.truncatingRemainder(dividingBy: 1000.0)

  return modded / 1000.0
}

func hashInt(intToHash: Int, seed: Float64) -> Float64 {
  let stringToHash = "\(intToHash)"
  return hashString(stringToHash: stringToHash, seed: seed)
}

func hashInt64(intToHash: Int64, seed: Float64) -> Float64 {
  let stringToHash = "\(intToHash)"
  return hashString(stringToHash: stringToHash, seed: seed)
}

func hashFloat(floatToHash: Float, seed: Float64) -> Float64 {
  let stringToHash = "\(floatToHash)"
  return hashString(stringToHash: stringToHash, seed: seed)
}

func hashFloat64(floatToHash: Float64, seed: Float64) -> Float64 {
  let stringToHash = "\(floatToHash)"
  return hashString(stringToHash: stringToHash, seed: seed)
}
