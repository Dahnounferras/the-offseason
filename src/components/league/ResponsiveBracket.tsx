import type { ComponentProps } from "react";
import BracketView from "@/components/league/BracketView";
import BracketList from "@/components/league/BracketList";

// Stacked list on phones, the connected tree from md up. Both get the same props.
export default function ResponsiveBracket(props: ComponentProps<typeof BracketView>) {
  return (
    <>
      <div className="md:hidden">
        <BracketList {...props} />
      </div>
      <div className="hidden md:block overflow-x-auto pb-4">
        <BracketView {...props} />
      </div>
    </>
  );
}
