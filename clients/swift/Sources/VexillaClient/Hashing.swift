import Foundation

func hashString(stringToHash: String, seed: Float64) -> Float64 {
  var total = 0
  for char in stringToHash.utf8 {
    total += Int(char)
  }

  var calculated = Float64(total) * seed * 42.0
  calculated.round(.down)
  let modded = calculated.truncatingRemainder(dividingBy: 100.0)

  return modded / 100.0
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
