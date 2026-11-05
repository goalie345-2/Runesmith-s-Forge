import { useState, useMemo, useRef } from "react";
import BuildCard from './BuildCard';
import './App.css';
import {toPng} from 'html-to-image';
import {
    DndContext, 
    DragOverlay, 
    PointerSensor, 
    KeyboardSensor, 
    useSensor,
    useSensors,
    useDraggable, 
    useDroppable, 
} from "@dnd-kit/core";
import runeJson from "/runes.json";
import comboJson from "/combos.json";
import Select from 'react-select';

const SLOTS = ["Banner", "Weapon", "Tailsman", "Shield", "Armor", "Master"];
const MAX_PER_SLOT = 3;
const All_Tags = "All Tags";
const TAGS = [
    { value: 'Armor', label: 'Armor' },
    { value: 'Banner', label: 'Banner' },
    { value: 'Talisman', label: 'Talisman' },
    { value: 'Weapon', label: 'Weapon' },
    { value: 'Armor', label: 'Armor' }
];

const RUNES = importRunes(runeJson);

// Example runes for each slot and one that fits anywhere
// const RUNES = [
//     { id: 1, name: "Standard Rune of Armor", tag: "Armor", description: "Example standard rune for the Armor slot." },
//     { id: 2, name: "Standard Rune of Banner", tag: "Banner", description: "Example standard rune for the Banner slot." },
//     { id: 3, name: "Standard Rune of Tailsman", tag: "Tailsman", description: "Example standard rune for the Tailsman slot." },
//     { id: 4, name: "Standard Rune of Weapon", tag: "Weapon", description: "Example standard rune for the Weapon slot." },
//     { id: 5, name: "Standard Rune of Example", tag: All_Tags, description: "Example standard rune that can go in any slot." },
//     { id: 6, name: "Master Rune of Example", tag: Master_Rune, slotTag: All_Tags, description: "Example Master Rune that can be placed in any slot." },
//     { id: 7, name: "Master Rune of Armor", tag: Master_Rune, slotTag: "Armor", description: "Master Rune that can only be placed in an Armor slot." },
//     { id: 8, name: "Master Rune of Banner", tag: Master_Rune, slotTag: "Banner", description: "Master Rune that can only be placed in a Banner slot." },
//     { id: 9, name: "Master Rune of Tailsman", tag: Master_Rune, slotTag: "Tailsman", description: "Master Rune that can only be placed in a Tailsman slot." },
//     { id: 10, name: "Master Rune of Weapon", tag: Master_Rune, slotTag: "Weapon", description: "Master Rune that can only be placed in a Weapon slot." },
// ];

const COMBOS = importCombos(comboJson);

// const COMBOS = [
//     { id: 1, name: "Grimnir's Burning Wroth", tag: "Banner", runeCount: 3, description: "When charging at an enemy or specific point, the user rapidly picks up speed and gains a protective shell of flame around them, gathering more and more energy until it can be released as an explosion of heat and power strong enough to melt steel or condensed into the user's weapon, allies unharmed." }
// ];


// Items use one slot unless they have a custom cost
const slotCost = (item) => {
    if (item.runeCount !== null && item.runeCount !== undefined) {
        return item.runeCount;
    }

    return 1;
};

const slotUsed = (items) => {
    let totalSlots = 0;

    for (const item of items) {
        totalSlots += slotCost(item);
    }

    return totalSlots;
};
// Used to enforce one Master Rune per slot
const isMasterRune = (item) => item.runeTypes.includes("Master Rune");
const canPlaceInSlot = (item, slotName) =>
    (isMasterRune(item) && (!item.slotTag || item.slotTag === All_Tags || item.slotTag === slotName)) ||
    item.tag === All_Tags ||
    item.tag === slotName ||
    (item.tag === "Armor" && slotName === "Shield");

function importRunes(data) {
    return data.map((rune, index) => ({
        id: index + 1,
        name: rune["Rune Name"],
        category: rune["Rune Category"],
        description: rune["Effect"],
        //Types must be comma delimited
        runeTypes: (rune["Rune Type"])
            .split(",")
            .map(type => type.trim()),
        //Tags must be comma delimited
        tags: (rune["Tags"])
            .split(",")
            .map(tag => tag.trim()),
        status: rune["Status"],
        reagents: rune["Reagent(s)"],
        knownBy: rune["Known By"],
        notes: rune["Notes/Development"],
        creator: rune["Creator"],
        lore: rune["Lore"],
        attribution: rune["Attribution"],
    }));
}

function importCombos(data) {
    return data.map((combo, index) => ({
        id: index + 1,
        name: combo["Combo Name"],
        //we put this in category because it lines up with what runes call "category"
        category: combo["Combo Type"],
        description: combo["Effect"],
        components: [
            combo["Component 1"],
            combo["Component 2"],
            combo["Component 3"],
            combo["Component 4"],
            combo["Component 5"],
        ]
            .map(component => component.trim()),
        notes: combo["Notes"],
        creator: combo["Creator"],
    }));
}

function DraggableListItem({ item, children }) {
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({
        // Include the type because rune and combo IDs can overlap
        id: `list-${item.type}-${item.id}`,
        data: { item, from: null },
    });

    return (
        // clicking and holding starts a drag, so the name can still be clicked
        <li ref={setNodeRef} style={{ opacity: isDragging ? 0.4 : 1 }}>
            <button
                ref={setActivatorNodeRef}
                {...listeners}
                {...attributes}
                aria-label={`Drag ${item.name} into a slot`}
                style={{ cursor: 'grab' }}
            >
                ⠿
            </button>
            {children}
        </li>
    );
}

function PlacedItem({ item, slotName, onRemove }) {
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({
        id: `placed-${item.uid}`,
        // Keep track of the slot so the item can be moved or removed
        data: { item, from: slotName },
    });

    return (
        <div
            ref={setNodeRef}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                padding: '4px 8px',
                marginBottom: '4px',
                borderRadius: '6px',
                backgroundColor: '#313244',
                opacity: isDragging ? 0.4 : 1,
            }}
        >
            {/* Drag the item name to move it */}
            <span
                ref={setActivatorNodeRef}
                {...listeners}
                {...attributes}
                style={{ cursor: 'grab', flex: 1, textAlign: 'left' }}
            >
                {item.name}
            </span>
            {/* Excludes unwanted elements from exported images */}
            <button
                data-no-export="true"
                onClick={(e) => {
                    e.stopPropagation();
                    onRemove(slotName, item.uid);
                }}
                aria-label={`Remove ${item.name} from ${slotName}`}
            >
                x
            </button>
        </div>
    );
}

function SlotDropZone({ name, items, onSelect, onRemove }) {
    const { setNodeRef, isOver } = useDroppable({ id: name });

    return (
        <section
            ref={setNodeRef}
            onClick={() => onSelect(name)}
            aria-label={`${name} slot`}
            style={{
                // Highlight the slot while an item is over it
                border: `2px dashed ${isOver ? '#a6e3a1' : '#585b70'}`,
                borderRadius: '8px',
                padding: '8px',
                minHeight: '56px',
            }}
        >
            <h3 style={{ margin: '0 0 8px' }}>
                {name} {slotUsed(items)}/{MAX_PER_SLOT}
            </h3>
            {items.map((item) => (
                <PlacedItem key={item.uid} item={item} slotName={name} onRemove={onRemove} />
            ))}
        </section>
    );
}

function ListDropZone({ children }) {
    const { setNodeRef, isOver } = useDroppable({ id: "list" });

    return (
        <main
            ref={setNodeRef}
            style={{
                flex: 1,
                minWidth: '320px',
                outline: isOver ? '2px dashed #a6e3a1' : '2px dashed transparent',
                outlineOffset: '8px',
            }}
        >
            {children}
        </main>
    );
}

export default function App() {
    const [query, setQuery] = useState("");
    const [selectedTags, setSelectedTags] = useState([]);
    const [isMasterChecked, setIsMasterChecked] = useState(false);
    const [tab, setTab] = useState("runes");
    const [expandedID, setExpandedID] = useState(null);
    const startingBuild = {};
    for (const slotName of SLOTS) {
        startingBuild[slotName] = [];
    }
    const [build, setBuild] = useState(startingBuild);
    const [, setTargetSlot] = useState("Banner");

    // Used for the drag preview and slot-full message
    const [activeItem, setActiveItem] = useState(null);
    const [error, setError] = useState("");
    const errorTimer = useRef(null);

    const sensors = useSensors(
        // A small movement keeps normal clicks from starting a drag
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor)
    );

    const entries = useMemo(() => {
        let source;
        let type;

        if (tab === "runes") {
            source = RUNES;
            type = "rune";
        } else {
            source = COMBOS;
            type = "combo";
        }

        const matchingEntries = [];
        const searchText = query.toLowerCase();

        for (const entry of source) {
            const nameMatches = entry.name.toLowerCase().includes(searchText);
            const tagMatches = selectedTags.length === 0 || selectedTags.some(x => x.value === entry.category);
            const masterMatches = tab != "runes" || !isMasterChecked || isMasterChecked && isMasterRune(entry);

            if (nameMatches && tagMatches && masterMatches) {
                matchingEntries.push(Object.assign({}, entry, { type }));
            }
        }

        return matchingEntries;
    }, [tab, query, selectedTags, isMasterChecked]);

    const exportRef = useRef(null);
    const [isExporting, setIsExporting] = useState(false);

    // Export the build card without its remove buttons
    const handleExport = async () => {
        if (!exportRef.current) return;

        try {
            setIsExporting(true);
            const dataUrl = await toPng(exportRef.current, {
                cacheBust: true,
                filter: (node) => !(node.dataset && node.dataset.noExport),
            });
        
            const link = document.createElement('a');
            link.download = 'my-rune-build.png';
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error('Error exporting image:', err);
        } finally {
            setIsExporting(false);
        }
    }; 

    const showError = (message) => {
        setError(message);
        clearTimeout(errorTimer.current);
        // Clear the message after 3.5 seconds
        errorTimer.current = setTimeout(() => setError(""), 3500);
    };

    const removeFromSlot = (slotName, uid) => {
        setBuild((previousBuild) => {
            const updatedBuild = Object.assign({}, previousBuild);
            const remainingItems = [];

            for (const item of previousBuild[slotName]) {
                if (item.uid !== uid) {
                    remainingItems.push(item);
                }
            }

            updatedBuild[slotName] = remainingItems;
            return updatedBuild;
        });
    };

    const handleDragStart = (dragEvent) => {
        const active = dragEvent.active;
        setActiveItem(active.data.current.item);
        setError("");
    };

    const handleDragEnd = (dragEvent) => {
        const active = dragEvent.active;
        const over = dragEvent.over;
        setActiveItem(null);
        if (!over) return;

        const { item, from } = active.data.current;

        // Dropping on the list removes the item from its slot
        if (over.id === "list") {
            if (from) removeFromSlot(from, item.uid);
            return;
        }

        if (over.id === from) return;

        if (!canPlaceInSlot(item, over.id)) {
            const requiredSlot = item.slotTag || item.tag;
            showError(`${item.name} can only be placed in the ${requiredSlot} slot.`);
            return;
        }

        const hasMasterRune = build[over.id].some(isMasterRune);
        if (isMasterRune(item) && hasMasterRune) {
            showError(`${over.id} can only contain one Master Rune.`);
            return;
        }

        // Makes it so you cannot exceed the maximum number of runes per slot
        const used = slotUsed(build[over.id]);
        if (used + slotCost(item) > MAX_PER_SLOT) {
            showError(
                `${over.id} is full (${used}/${MAX_PER_SLOT}). Remove a rune from it before adding ${item.name}.`
            );
            return;
        }

        setBuild((prev) => {
            const next = Object.assign({}, prev);
            if (from) {
                const remainingItems = [];
                for (const placedItem of prev[from]) {
                    if (placedItem.uid !== item.uid) {
                        remainingItems.push(placedItem);
                    }
                }
                next[from] = remainingItems;
            }

            // Give placed items their own IDs
            let itemId = item.uid;
            if (itemId === null || itemId === undefined) {
                itemId = crypto.randomUUID();
            }

            const placedItem = Object.assign({}, item, { uid: itemId });
            next[over.id] = prev[over.id].concat(placedItem);
            return next;
        });
    };

    const slot = (slotName) => (
        <SlotDropZone
            name={slotName}
            items={build[slotName]}
            onSelect={setTargetSlot}
            onRemove={removeFromSlot}
        />
    );

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setActiveItem(null)}
        >
            <div style={{ display: 'flex', gap: '32px', padding: '24px', alignItems: 'flex-start' }}>
                <aside style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <BuildCard ref={exportRef} slot={slot} />

                    {/* Keep the error outside the exported card */}
                    {error && (
                        <p role="alert" style={{ color: '#e64553', fontWeight: 'bold', maxWidth: '300px' }}>
                            {error}
                        </p>
                    )}

                    <button
                        onClick={handleExport}
                        disabled={isExporting}
                        style={{
                            padding: '10px 16px',
                            cursor: isExporting ? 'not-allowed' : 'pointer',
                            fontWeight: 'bold',
                        }}
                    >
                        {isExporting ? 'Exporting...' : 'Export as PNG'}
                    </button>
                </aside>
                <ListDropZone>
                    <div>
                        <div>
                            {/* Search by name */}
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
                            {/* Filter by tag */}
                            <label htmlFor="filter">Filter</label>
                            <Select
                                options={TAGS}
                                value={selectedTags}
                                isMulti={true}
                                onChange={(e) => setSelectedTags(e) }
                            />
                        </div>
                        {tab == "runes" ?
                            (<div>
                                <label>Show master runes only</label>
                                <input type="checkbox"
                                    checked={isMasterChecked}
                                    onChange={e => setIsMasterChecked(e.target.checked)} />
                            </div>) : ""
                        }
                        <div>
                            {/* Switch between runes and combos */}
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

                        <ul style={{ listStyle: 'none', padding: 0 }}>
                            {entries.length === 0 && (
                                <li>No matches. Clear the search or filter.</li>
                            )}

                            {/* Show the filtered entries */}
                            {entries.map((item) => {
                                const open = expandedID === item.id;
                                return (
                                    <DraggableListItem key={`${item.type}-${item.id}`} item={item}>
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
                                                    {/* filtering only needed for components which may have empty entries */}
                                                    {item.description} <em>Category: {item.category}</em> {item.runeTypes ? (<em>Type(s): {item.runeTypes.join(', ')}</em>) : ""} {item.tags ? (<em>Tag(s): {item.tags.join(', ')}</em>) : (<em>Component(s): {item.components.filter(Boolean).join(', ')}</em>)}
                                                </p>
                                            </div>
                                        )}
                                    </DraggableListItem>
                                );
                            })}
                        </ul>
                    </div>
                </ListDropZone>
            </div>

            {/* Preview shown while dragging */}
            <DragOverlay>
                {activeItem ? (
                    <div
                        style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            backgroundColor: '#313244',
                            color: '#ffffff',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                            cursor: 'grabbing',
                        }}
                    >
                        <strong>{activeItem.name}</strong>
                        <p style={{ margin: '6px 0 0' }}>{activeItem.description}</p>
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
