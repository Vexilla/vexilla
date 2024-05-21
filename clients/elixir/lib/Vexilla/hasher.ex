defmodule Hasher do
  @moduledoc false

  @doc """
  Hash a string into a float value between 0 and 1

  ## Examples

    iex> Hasher.hash_string("b7e91cc5-ec76-4ec3-9c1c-075032a13a1a", 0.32)
    0.28

    iex> Hasher.hash_string("b7e91cc5-ec76-4ec3-9c1c-075032a13a1a", 0.22)
    0.56


  """

  @fnv32_offset_basis 2166136261;
  @fnv32_prime 16777619;

  def hash_string(instance_id, seed) do

    characters = String.to_charlist(instance_id)

    total = Enum.reduce(characters, @fnv32_offset_basis, fn character, acc ->
      acc = Bitwise.bxor(acc, character)
      acc * @fnv32_prime
    end)

    seededResult = total * seed

    result = Kernel.rem(Kernel.trunc(seededResult), 100)
    result = result  / 100

    Kernel.abs(result)
  end

  @doc """
  Hash a number into a float value between 0 and 1

  ## Examples

    iex> Hasher.hash_number(42, 0.11)
    0.71

  """
  def hash_number(number, seed) do
    hash_string("#{number}", seed)
  end
end
