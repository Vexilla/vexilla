defmodule Hasher do
  @moduledoc false

  @doc """
  Hash a string into a float value between 0 and 1

  ## Examples

    iex> Hasher.hash_string("b7e91cc5-ec76-4ec3-9c1c-075032a13a1a", 0.32) <= 0.4
    true

    iex> Hasher.hash_string("b7e91cc5-ec76-4ec3-9c1c-075032a13a1a", 0.22) > 0.4
    true


  """

  def hash_string(instance_id, seed) do
    Fnv1a.hash(instance_id)
    |> Kernel.*(seed)
    |> Kernel.trunc
    |> Kernel.rem(1000)
    |> Kernel./(1000)
  end

  @doc """
  Hash a number into a float value between 0 and 1

  ## Examples

    iex> Hasher.hash_number(42, 0.11) > 0.40
    true

  """
  def hash_number(number, seed) do
    hash_string("#{number}", seed)
  end
end
