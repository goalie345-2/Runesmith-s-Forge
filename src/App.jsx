import { useState, useMemo, useRef } from "react";
import BuildCard from './BuildCard';
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

const SLOTS = ["Banner", "Weapon", "Tailsman", "Shield", "Armor"];
const MAX_PER_SLOT = 3;
const MASTER_RUNE_TAG = "Master";
const ALL_TAGS = "All Tags";
const TAGS = ["All Tags", "Armor", "Banner", "Tailsman", "Weapon", "Master"];

// Example runes for each slot and one that fits anywhere
const RUNES = [
    { id: 1, name: "Standard Rune of Armor", tag: "Armor", description: "Example standard rune for the Armor slot." },
    { id: 2, name: "Standard Rune of Banner", tag: "Banner", description: "Example standard rune for the Banner slot." },
    { id: 3, name: "Standard Rune of Tailsman", tag: "Tailsman", description: "Example standard rune for the Tailsman slot." },
    { id: 4, name: "Standard Rune of Weapon", tag: "Weapon", description: "Example standard rune for the Weapon slot." },
    { id: 5, name: "Standard Rune of Example", tag: ALL_TAGS, description: "Example standard rune that can go in any slot." },
    { id: 6, name: "Master Rune of Example", tag: MASTER_RUNE_TAG, description: "Example Master Rune for testing the one-per-slot rule." },
    { id: 7, name: "Master Rune of Example", tag: MASTER_RUNE_TAG, description: "Second example Master Rune for testing the one-per-slot rule." },
];

const COMBOS = [
    { id: 1, name: "Grimnir's Burning Wroth", tag: "Banner", runeCount: 3, description: "When charging at an enemy or specific point, the user rapidly picks up speed and gains a protective shell of flame around them, gathering more and more energy until it can be released as an explosion of heat and power strong enough to melt steel or condensed into the user's weapon, allies unharmed." }
];


// Items use one slot unless they have a custom cost
const slotCost = (item) => item.runeCount ?? 1;
const slotUsed = (items) => items.reduce((sum, i) => sum + slotCost(i), 0);
// Used to enforce one Master Rune per slot
const isMasterRune = (item) => item.tag === MASTER_RUNE_TAG;
const canPlaceInSlot = (item, slotName) =>
    isMasterRune(item) ||
    item.tag === ALL_TAGS ||
    item.tag === slotName ||
    (item.tag === "Armor" && slotName === "Shield");

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
    const [tag, setTag] = useState("All Tags");
    const [tab, setTab] = useState("runes");
    const [expandedID, setExpandedID] = useState(null);
    const [build, setBuild] = useState(
        Object.fromEntries(SLOTS.map((s) => [s, []]))
    );
    const [targetSlot, setTargetSlot] = useState("Banner");

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
        const source = tab === "runes" ? RUNES : COMBOS;
        const type = tab === "runes" ? "rune" : "combo";
        return source
            .filter(
                (r) =>
                    r.name.toLowerCase().includes(query.toLowerCase()) &&
                    (tag === "All Tags" || r.tag === tag)
            )
            .map((r) => ({ ...r, type }));
    }, [tab, query, tag]);

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
        setBuild((prev) => ({
            ...prev,
            [slotName]: prev[slotName].filter((r) => r.uid !== uid),
        }));
    };

    const handleDragStart = ({ active }) => {
        setActiveItem(active.data.current.item);
        setError("");
    };

    const handleDragEnd = ({ active, over }) => {
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
            showError(`${item.name} can only be placed in the ${item.tag} slot.`);
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
            const next = { ...prev };
            if (from) next[from] = prev[from].filter((r) => r.uid !== item.uid);
            // Give placed items their own IDs
            next[over.id] = [...prev[over.id], { ...item, uid: item.uid ?? crypto.randomUUID() }];
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
                            <select
                                id="filter"
                                value={tag}
                                onChange={(e) => setTag(e.target.value)}
                            >
                                {TAGS.map((t) => (
                                    <option key={t}>{t}</option>
                                ))}
                            </select>
                        </div>

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
                                                    {item.description} <em>Tag: {item.tag}</em>
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
