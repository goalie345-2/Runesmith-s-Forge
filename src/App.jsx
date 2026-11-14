import { useState, useMemo, useRef } from "react";
import BuildCard from './BuildCard';
import DragAndDrop, { ListDropZone } from './DragAndDrop';
import { isMasterRune } from './dragRules';
import './App.css';
import {toPng} from 'html-to-image';
import runeJson from "/runes.json";
import comboJson from "/combos.json";
import Select from 'react-select';

const SLOTS = ["Banner", "Weapon", "Tailsman", "Shield", "Armor"];
const TAGS = [
    { value: 'Armor', label: 'Armor' },
    { value: 'Banner', label: 'Banner' },
    { value: 'Talisman', label: 'Talisman' },
    { value: 'Weapon', label: 'Weapon' },
    { value: 'Armor', label: 'Armor' }
];

const RUNES = importRunes(runeJson);
const COMBOS = importCombos(comboJson);

function importRunes(data) {
    return data.map((rune, index) => ({
        id: index + 1,
        name: rune["Rune Name"],
        category: (rune["Rune Category"])
            .split(",")
            .map(type => type.trim()),
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
        category: (combo["Combo Type"])
            .split(",")
            .map(type => type.trim()),
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
    const [error, setError] = useState("");
    const errorTimer = useRef(null);

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
            //we want to be searching through tags as well - this is probably close but not quite working
            const nameMatches = entry.name.toLowerCase().includes(searchText) || entry.tags?.some(x=> x.value === searchText);
            //tagmatches must be fixed now that categories is an array instead of a single value
            const tagMatches = selectedTags.length === 0 || selectedTags.some(x => x.value === entry.category);
            const masterMatches = tab != "runes" || !isMasterChecked || isMasterChecked && !isMasterRune(entry);

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

    return (
        <DragAndDrop
            build={build}
            setBuild={setBuild}
            showError={showError}
            removeFromSlot={removeFromSlot}
            setTargetSlot={setTargetSlot}
        >
        {({ slot, DraggableListItem }) => (
        <>
            <header
                style={{
                    padding: '16px 32px',
                    backgroundColor: 'var(--dark, #3d362f)',
                    color: 'var(--title, #f1e6cc)',
                    fontSize: '28px',
                    fontWeight: 'bold',
                    letterSpacing: '0.3px',
                    fontFamily: 'Georgia, "Times New Roman", serif',
                }}
            >
                Runesmith's Forge
            </header>

            <div style={{ display: 'flex', gap: '32px', padding: '24px', alignItems: 'flex-start' }}>
                
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
                                <label>Hide master runes</label>
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

                        <ul style={{ 
                            listStyle: 'none', 
                            padding: 0,
                            margin: 0,
                            height: '620px',
                            maxHeight: '620px',
                            overflowY: 'auto',
                            overflowX: 'hidden',
                            }}
                            >
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
                                                    {item.description} <em>Category: {item.category.join(", ")}</em> {item.runeTypes ? (<em>Type(s): {item.runeTypes.join(', ')}</em>) : ""} {item.tags ? (<em>Tag(s): {item.tags.join(', ')}</em>) : (<em>Component(s): {item.components.filter(Boolean).join(', ')}</em>)}
                                                </p>
                                            </div>
                                        )}
                                    </DraggableListItem>
                                );
                            })}
                        </ul>
                    </div>
                </ListDropZone>
                
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
            </div>

        </>
        )}
        </DragAndDrop>
    );
}
