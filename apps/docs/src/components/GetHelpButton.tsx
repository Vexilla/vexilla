import { useRef, useState } from "react";

import clsx from "clsx";

import { DISCORD_INVITE_LINK } from "@/utils/constants";

import { Icon } from "@iconify/react";
import questionFill from "@iconify/icons-ph/question-fill";

export function GetHelpButton() {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <dialog
        ref={dialogRef}
        className={clsx(
          "fixed top-[calc(100vh-18rem)] left-[calc(100vw-20rem)] m-0 bg-primary-100 text-black dark:bg-primary-900 dark:text-white dark:border p-0 z-[1000] w-60 backdrop:bg-black/75",
        )}
      >
        <form method="dialog" className="w-full text-right">
          <button className="p-1 m-2" autoFocus>
            close
          </button>
        </form>
        <div className="flex flex-col gap-4 p-4 pt-0">
          <div>
            <strong>Need help?</strong> Check out our{" "}
            <a href={DISCORD_INVITE_LINK} className="always-underline">
              Discord.
            </a>
          </div>

          <div>
            <strong>Enterprise or Open Source?</strong> Reach out directly on
            our{" "}
            <a href="/services" className="always-underline">
              Services
            </a>{" "}
            page.
          </div>
        </div>
      </dialog>
      <button
        className="fixed bottom-4 right-4 rounded-full"
        onClick={() => {
          if (!dialogRef.current) {
            return;
          }
          if (dialogRef.current.open) {
            dialogRef.current.close();
          } else {
            dialogRef.current.showModal();
          }
        }}
      >
        <Icon
          icon={questionFill}
          width={"4rem"}
          className="text-primary-500 bg-white rounded-full"
        />
      </button>
    </>
  );
}
