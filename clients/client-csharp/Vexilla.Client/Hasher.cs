using System;
using System.Linq;

namespace Vexilla.Client
{

    public class VexillaHasher
    {
        private Double seed;

        public VexillaHasher(Double seed)
        {
            this.seed = seed;
        }

        public Double hashString(String stringToHash)
        {
            int sum = stringToHash
                .ToCharArray()
                .Select(character => (int)character)
                .Aggregate((x, y) => x + y);

            return Math.Floor(sum * this.seed * 42) % 100;
        }
    }
}
