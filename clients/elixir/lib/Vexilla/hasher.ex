defmodule Hasher do
  @moduledoc """
  Documentation for `Hasher`.
  """

  @doc """
  Hash a string into a float value between 0 and 1

  ## Examples

    iex> Hasher.hash_string("b7e91cc5-ec76-4ec3-9c1c-075032a13a1a", 0.11)
    0.28

    iex> Hasher.hash_string("b7e91cc5-ec76-4ec3-9c1c-075032a13a1a", 0.22)
    0.56


  """
  def hash_string(instance_id, seed) do
    characters = String.to_charlist(instance_id)
    character_total = Enum.sum(characters)

    rem(Kernel.trunc(Float.floor(character_total * seed * 42.0)), 100) / 100
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
