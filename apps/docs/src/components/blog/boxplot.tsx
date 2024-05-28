import { useEffect, useRef, useState, type KeyboardEventHandler } from "react";
import { ResponsiveBoxPlot, type BoxPlotDatum, BoxPlot } from "@nivo/boxplot";
import { Tooltip } from "@nivo/tooltip";
import { Button } from "../ui/button";

interface RawRow {
  algorithm: string;
  value: number;
  time: number;
}

function parseRawData(
  rows: RawRow[],
  valueKey: keyof RawRow = "value",
): BoxPlotDatum[] {
  return rows.map((row) => ({
    group: row.algorithm.trim(),
    // mu: row[bucket] as number,
    // mu: 20,
    sd: 1,
    // n: 5,
    value: row[valueKey],
  }));
}

interface BoxPlotComponentProps {
  title?: string;
  dataPath: string;
  count: number;
  iterations?: number;
  valueKey?: keyof RawRow;
  lowerBound?: number;
  upperBound?: number;
}

export function BoxPlotComponent({
  title = "",
  dataPath,
  count,
  iterations = 1000,
  valueKey = "value",
  lowerBound = 0,
  upperBound = 1,
}: BoxPlotComponentProps) {
  const [data, setData] = useState<BoxPlotDatum[]>([]);
  const showingDialog = useRef(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (dataPath) {
      fetch(`${location.origin}${dataPath}`)
        .then((response) => response.json())
        .then((data) => {
          const parsedData = parseRawData(data, valueKey);
          setData(parsedData);
        });
    }
  }, [dataPath, valueKey]);

  return (
    <>
      <dialog open={false} ref={dialogRef}>
        <div className="relative dark:bg-black">
          <div className="flex flex-row w-full items-center justify-between p-2">
            <h3 className="!m-0">{title}</h3>
            <button
              className="dark:text-white p-2"
              onClick={() => {
                showingDialog.current = false;
                dialogRef.current?.close();
              }}
            >
              Close
            </button>
          </div>
          <div className="overflow-y-scroll w-full h-[80vh]">
            <div
              className="box-plot-wrapper not-prose text-black"
              style={{ height: 1500, width: 1000 }}
            >
              <ResponsiveBoxPlot
                data={[...data].reverse()}
                layout="horizontal"
                quantiles={[lowerBound, 0.25, 0.5, 0.75, upperBound]}
                margin={{
                  top: 20,
                  right: 40,
                  bottom: 40,
                  left: 180,
                }}
                padding={0.12}
                enableGridX={true}
                axisTop={{
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: 0,
                  legend: "",
                  legendOffset: -50,
                  truncateTickAt: 0,
                }}
                axisBottom={{
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: 0,
                  legend: "",
                  legendOffset: 32,
                  truncateTickAt: 0,
                }}
                axisLeft={{
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: 0,
                  legend: "",
                  legendOffset: -40,
                  truncateTickAt: 0,
                }}
                colors={["#257DDD"]}
                borderRadius={2}
                borderWidth={2}
                borderColor={{
                  from: "color",
                  modifiers: [["darker", 0.3]],
                }}
                medianWidth={4}
                medianColor={"#FFFFFF"}
                whiskerEndSize={0.6}
                whiskerColor={"#c92a2a"}
                whiskerWidth={4}
                motionConfig="stiff"
              />
            </div>
          </div>
        </div>
      </dialog>
      <div
        className="box-plot-wrapper not-prose text-black"
        style={{ height: 400, width: "100%" }}
      >
        <ResponsiveBoxPlot
          data={data.slice(0, count * iterations).reverse()}
          layout="horizontal"
          quantiles={[lowerBound, 0.25, 0.5, 0.75, upperBound]}
          margin={{
            top: 40,
            right: 100,
            bottom: 40,
            left: 100,
          }}
          padding={0.12}
          enableGridX={true}
          axisTop={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: "",
            legendOffset: -50,
            truncateTickAt: 0,
          }}
          axisRight={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: "",
            legendOffset: 0,
            truncateTickAt: 0,
          }}
          axisBottom={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: "",
            legendOffset: 32,
            truncateTickAt: 0,
          }}
          axisLeft={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: "",
            legendOffset: -40,
            truncateTickAt: 0,
          }}
          colors={["#257DDD"]}
          borderRadius={2}
          borderWidth={2}
          borderColor={{
            from: "color",
            modifiers: [["darker", 0.3]],
          }}
          medianWidth={2}
          medianColor={"#FFFFFF"}
          whiskerEndSize={0.6}
          whiskerColor={"#c92a2a"}
          whiskerWidth={4}
          motionConfig="stiff"
          // tooltip={{
          //   color: "#FFF",
          // }}
          // tooltip={(props) => (
          //   <div className="p-2 rounded bg-white">
          //     <div className="flex items-center gap-2">
          //       <div
          //         className="h-4 w-4 rounded-sm"
          //         style={{ background: props.color }}
          //       ></div>
          //       {props.label}
          //     </div>
          //     <div className="flex gap-2">
          //       <ul className="w-1/2 flex flex-col p-0 m-0">
          //         <li className="flex gap-2 p-0 m-0">
          //           <span>label</span>
          //           <span>value</span>
          //         </li>
          //       </ul>
          //     </div>
          //   </div>
          // )}
        />
      </div>
      <div className="flex flex-row items-center justify-center">
        <Button
          className="text-white"
          onClick={() => {
            showingDialog.current = true;
            dialogRef.current?.showModal();
          }}
        >
          See full results
        </Button>
      </div>
    </>
  );
}
