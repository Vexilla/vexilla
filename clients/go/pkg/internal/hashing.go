package internal

import (
	"hash/fnv"
	"strconv"
)

const FNV32_OFFSET_BASIS = 2166136261
const FNV32_PRIME = 16777619

// export function hashString(stringToHash: string, seed: number) {

//   let total = FNV32_OFFSET_BASIS;
//   const length = byteArray.length;

//   for (let i = 0; i < length; i++) {
//     const byte = byteArray[i];
//     total = total ^ byte;
//     total = total * FNV32_PRIME;
//   }

//   const result = ((total * seed) % 100) / 100;
//   return Math.abs(result);
// }

func HashStringInstanceID(instanceID string, seed float64) float64 {
	chars := ([]byte)(instanceID)
	hash := fnv.New64a()
	hash.Write(chars)
	result := hash.Sum64()

	return float64(uint64(float64(result)*seed)%100) / 100.0
}

func HashIntInstanceID(instanceId int64, seed float64) float64 {
	stringInstanceId := strconv.Itoa(int(instanceId))
	return HashStringInstanceID(stringInstanceId, seed)
}

func HashFloatInstanceID(instanceId float64, seed float64) float64 {
	stringInstanceId := strconv.FormatFloat(instanceId, 'g', -1, 64)
	return HashStringInstanceID(stringInstanceId, seed)
}
