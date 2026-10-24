defmodule VexillaContractError do
  defexception [:kind, :message]
end

defmodule VexillaCompatibility do
  @external_resource Path.expand("../../priv/compatibility.json", __DIR__)
  @data @external_resource |> File.read!() |> Jason.decode!()
  @unicode @data["unicode"]
  @zones MapSet.new(Enum.map(@data["timezone"]["identifiers"], &String.downcase(&1, :ascii)))
  @offset Regex.compile!("\\A(?:" <> @data["timezone"]["offsetPattern"] <> ")\\z")
  def timezone(text), do: MapSet.member?(@zones, ascii_lower(text)) or Regex.match?(@offset, text)

  defp ascii_lower(text),
    do: for(<<n <- text>>, into: "", do: <<if(n in 65..90, do: n + 32, else: n)>>)

  defp in_ranges(n, ranges), do: Enum.any?(ranges, fn [a, b] -> n >= a and n <= b end)

  defp lower(text) do
    chars = String.codepoints(text)

    chars
    |> Enum.with_index()
    |> Enum.map_join(fn {ch, i} ->
      if ch == "Σ" do
        before =
          chars
          |> Enum.take(i)
          |> Enum.reverse()
          |> Enum.drop_while(&in_ranges(code(&1), @unicode["ignorableRanges"]))
          |> List.first()

        after_char =
          chars
          |> Enum.drop(i + 1)
          |> Enum.drop_while(&in_ranges(code(&1), @unicode["ignorableRanges"]))
          |> List.first()

        if before != nil and in_ranges(code(before), @unicode["casedRanges"]) and
             (after_char == nil or not in_ranges(code(after_char), @unicode["casedRanges"])),
           do: "ς",
           else: "σ"
      else
        Map.get(@unicode["lower"], ch, ch)
      end
    end)
  end

  defp code(<<n::utf8>>), do: n
  defp upper(n), do: n in 65..90 or n in 192..214 or n in 216..222
  defp lower_base(n), do: n in 97..122 or n in 223..246 or n in 248..255

  defp symbol(n),
    do:
      n in 32..38 or n in 40..47 or n in 58..64 or n in 91..96 or n in 123..126 or n in 160..191 or
        n in [215, 247]

  defp split_caps([]), do: []

  defp split_caps([ch | tail]) do
    {caps, rest} = Enum.split_while(tail, &upper/1)

    if not upper(ch) and caps != [] do
      middle = if length(caps) > 1, do: [32] ++ Enum.drop(caps, -1) ++ [32], else: [32]
      [ch] ++ middle ++ [List.last(caps)] ++ split_caps(rest)
    else
      [ch | split_caps(tail)]
    end
  end

  defp split_symbols([]), do: []

  defp split_symbols([ch | tail]) do
    if symbol(ch) do
      case Enum.drop_while(tail, &symbol/1) do
        [] -> []
        [next | rest] -> [45, next | split_symbols(rest)]
      end
    else
      [ch | split_symbols(tail)]
    end
  end

  def normalize(text) do
    chars = String.to_charlist(text)
    has_lower = Enum.any?(chars, &lower_base/1)
    has_room = Enum.any?(chars, &symbol/1)
    chars = if chars != [] and not has_lower, do: String.to_charlist(lower(text)), else: chars
    chars = if has_room, do: chars, else: split_caps(chars)

    chars
    |> List.to_string()
    |> lower()
    |> String.to_charlist()
    |> split_symbols()
    |> Enum.reject(&(&1 == 39))
    |> List.to_string()
  end
end
