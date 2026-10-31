import { useState, useMemo } from "react";

const SLOTS = ["Slot1", "Slot2", "Slot3", "Slot4", "Slot5"];
const MAX_PER_SLOT = 3;
const TAGS = ["Tag1", "Tag2", "Tag3", "Tag4"];

const RUNES = Array.from({ length: 4 }, (_, i) => ({
    id: i + 1,
    name: "Master Rune of Examples" + " " + i,
    tag: TAGS[i % TAGS.length],
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
}));

const COMBOS = [
    { id: 1, name: "Grimnir's Burning Wroth", tag: TAGS[0], description: "When charging at an enemy or specific point, the user rapidly picks up speed and gains a protective shell of flame around them, gathering more and more energy until it can be released as an explosion of heat and power strong enough to melt steel or condensed into the user's weapon, allies unharmed." }
];

export default function App() {
    //states are like variable that hold what is assigned currently to whatever value
    const [query, setQuery] = useState("");
    const [tag, setTag] = useState("");
    const [tab, setTab] = useState("runes");
    const [expandedID, setExpandedID] = useState(null);
    const [build, setBuild] = useState(
        Object.fromEntries(SLOTS.map((s) => [s, []]))
    );
    const [targetSlot, setTargetSlot] = useState("Slot1");

    //entries filters down our giant list of runes to what we're looking for
    const entries = useMemo(() => {
        const source = tab === "runes" ? RUNES : COMBOS;
        return source.filter(
            (r) =>
            //search is only based on name at the moment
                r.name.toLowerCase().includes(query.toLowerCase()) &&
                //selected tag is empty or rune is the selected tag
                (tag === "" || r.tag === tag)
        );
    }, [tab, query, tag]);

    //builds the structure of each build, what it looks like
    const slot = (slot) => (
        <section
            onClick={() => setTargetSlot(slot)}
            aria-label={`${slot} slot`}
        >
            <h3>
                {slot} {build[slot].length}/{MAX_PER_SLOT}
            </h3>
        </section>
    );

    return (
        <div>
            <main>
                <div>
                    <div>
                        {/* The text search box for names */}
                        <label htmlFor="search">Search</label>
                        <input
                            id="search"
                            type="text"
                            placeholder="Search runes"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                    </div>

                    <div>
                        {/* The filter dropdown for ?categories? */}
                        <label htmlFor="filter">Filter</label>
                        <select
                            id="filter"
                            value={tag}
                            onChange={(e) => setTag(e.target.value)}
                        >
                            <option></option>
                            {TAGS.map((t) => (
                                <option key={t}>{t}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        {/* Tab selection */}
                        {["runes", "combos"].map((v) => (
                            <button
                                key={v}
                                role="tab"
                                aria-selected={tab === v}
                                onClick={() => {
                                    setTab(v);
                                    setExpandedID(null);
                                }}
                            >
                                {v === "runes" ? "Runes" : "Combos"}
                            </button>
                        ))}
                    </div>

                    <ul>
                        {entries.length === 0 && (
                            <li>No matches. Clear the search or filter.</li>
                        )}

                        {/* Turn filtered list of runes/combos into accordion items*/}
                        {entries.map((item) => {
                            const open = expandedID === item.id;
                            return (
                                <li key={item.id}>
                                    <button
                                        aria-expanded={open}
                                        onClick={() => setExpandedID(open ? null : item.id)}
                                    >
                                        <span />
                                        {item.name}
                                    </button>
                                    {open && (
                                        <div>
                                            <p>
                                                {item.description} <em>Tag: {item.tag}</em>
                                            </p>
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </div>


                {/* Build slots */}
                <aside>
                    <h2>Build</h2>
                    <div>
                        <div>{slot("Slot1")}</div>
                        <div>{slot("Slot2")}</div>
                        <div>{slot("Slot3")}</div>
                        <div>{slot("Slot4")}</div>
                        <div>{slot("Slot5")}</div>
                    </div>
                </aside>
            </main>
        </div>
    );
}
