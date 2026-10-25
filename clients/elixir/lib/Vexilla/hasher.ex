defmodule Hasher do
  import Bitwise

  def validate_instance(value) do
    valid =
      cond do
        is_binary(value) ->
          String.valid?(value)

        is_float(value) ->
          true

        is_integer(value) ->
          try do
            trunc(value * 1.0) == value
          rescue
            ArithmeticError -> false
          end

        true ->
          false
      end

    unless valid,
      do:
        raise(VexillaContractError,
          kind: "instance",
          message: "Expected Unicode string or exact finite binary64 ID"
        )

    :ok
  end

  def instance_text(value) do
    validate_instance(value)

    cond do
      is_binary(value) -> value
      value == 0 -> "0"
      true -> format(value * 1.0)
    end
  end

  defp format(value) do
    [mantissa | exponent] =
      abs(value) |> :erlang.float_to_binary([:short]) |> String.downcase() |> String.split("e")

    power = if exponent == [], do: 0, else: String.to_integer(hd(exponent))

    point =
      case :binary.match(mantissa, ".") do
        {i, _} -> i
        :nomatch -> byte_size(mantissa)
      end + power

    raw = String.replace(mantissa, ".", "")
    leading = byte_size(raw) - byte_size(String.trim_leading(raw, "0"))
    point = point - leading
    digits = raw |> String.trim_leading("0") |> String.trim_trailing("0")
    length = byte_size(digits)
    sign = if value < 0, do: "-", else: ""

    rendered =
      cond do
        point > 0 and point <= 21 ->
          if length <= point,
            do: digits <> String.duplicate("0", point - length),
            else:
              binary_part(digits, 0, point) <> "." <> binary_part(digits, point, length - point)

        point <= 0 and point > -6 ->
          "0." <> String.duplicate("0", -point) <> digits

        true ->
          e = point - 1

          binary_part(digits, 0, 1) <>
            if(length > 1, do: "." <> binary_part(digits, 1, length - 1), else: "") <>
            "e" <> if(e >= 0, do: "+", else: "-") <> Integer.to_string(abs(e))
      end

    sign <> rendered
  end

  def hash_fnv32a(text) when is_binary(text) do
    validate_instance(text)

    for <<byte <- text>>, reduce: 2_166_136_261 do
      acc -> band(bxor(acc, byte) * 16_777_619, 0xFFFFFFFF)
    end
  end

  def hash_string(instance_id, seed),
    do: :math.fmod(hash_fnv32a(instance_id) * seed, 1000.0) / 1000.0

  def hash_number(number, seed), do: hash_string(instance_text(number), seed)
end
