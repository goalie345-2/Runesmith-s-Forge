import { cloneElement, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    DndContext,
    PointerSensor,
    pointerWithin,
    useDraggable,
    useDroppable,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import { isMasterRune } from './dragRules';

const MAX_PER_SLOT = 3;
const BUILD_SLOTS = ['Banner', 'Weapon', 'Tailsman', 'Shield', 'Armor'];

// Only use the slot directly under the cursor
const cursorCollisionDetection = (args) => {
    return pointerWithin(args);
};

// Calculate rune costs and slot usage
const slotCost = (item) => item.runeCount ?? 1;
const slotUsed = (items) => items.reduce((total, item) => total + slotCost(item), 0);

// Determines which build slot an item qualifies for
const getCompatibleSlots = (item) => {
    const categoryText = item.category?.join(',').toLowerCase() ?? '';
    const slots = [];
// Allow "all" category runes fill into any slot
    if (item.category?.some((category) => category.trim().toLowerCase() === 'all')) {
        return BUILD_SLOTS;
    }

    if (/\bbanner\b/.test(categoryText)) slots.push('Banner');
    // Weapon subcategories, including "Weapons (thrown)", use the Weapon slot
    if (/\bweapons?\b/.test(categoryText)) slots.push('Weapon');
    if (/\btalisman\b/.test(categoryText)) slots.push('Tailsman');
    // Shield-only armor runes only work on shields; Regular armor runes will also works on shields
    if (/\barmou?r\b/.test(categoryText)) {
        const isShieldOnly = /\bshield/.test(categoryText) && !/\bnot shields?\b/.test(categoryText);
        slots.push(isShieldOnly ? 'Shield' : 'Armor');
        if (!isShieldOnly && !/\bnot shields?\b/.test(categoryText)) slots.push('Shield');
    }

    return slots;
};

const canPlaceInSlot = (item, slotName) => getCompatibleSlots(item).includes(slotName);

// Make items in the list draggable
function DraggableListItem({ item, children }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `list-${item.type}-${item.id}`,
        data: { item, from: null },
    });

    const childElements = Array.isArray(children) ? children : [children];
    const title = childElements[0];

    return (
        <li ref={setNodeRef} className={isDragging ? 'drag-item is-dragging' : 'drag-item'}>
            {cloneElement(title, {
                ...listeners,
                ...attributes,
                'aria-label': `Drag ${item.name} into a slot`,
            })}
            {childElements.slice(1)}
        </li>
    );
}

// Make items already in the build draggable and removable
function PlacedItem({ item, slotName, onRemove }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `placed-${item.uid}`,
        data: { item, from: slotName },
    });

    return (
        <div
            ref={setNodeRef}
            className={isDragging ? 'placed-item is-dragging' : 'placed-item'}
        >
            <span {...listeners} {...attributes} className="placed-item-name">
                {item.name}
            </span>
            <button
                data-no-export="true"
                onClick={(event) => {
                    event.stopPropagation();
                    onRemove(slotName, item.uid);
                }}
                aria-label={`Remove ${item.name} from ${slotName}`}
            >
                x
            </button>
        </div>
    );
}

// Render one build slot and its contents
function SlotDropZone({ name, items, onSelect, onRemove }) {
    const { setNodeRef, isOver } = useDroppable({ id: name });

    return (
        <section
            ref={setNodeRef}
            onClick={() => onSelect(name)}
            aria-label={`${name} slot`}
            className={`slot-drop-zone${isOver ? ' is-over' : ''}`}
        >
            <h3 className="slot-title">
                {name} {slotUsed(items)}/{MAX_PER_SLOT}
            </h3>
            {items.map((item) => (
                <PlacedItem key={item.uid} item={item} slotName={name} onRemove={onRemove} />
            ))}
        </section>
    );
}

// Allow runes to be dropped back into the list to remove them from the build
export function ListDropZone({ children }) {
    const { setNodeRef, isOver } = useDroppable({ id: 'list' });

    return (
        <main
            ref={setNodeRef}
            className={`list-drop-zone${isOver ? ' is-over' : ''}`}
        >
            {children}
        </main>
    );
}

export default function DragAndDrop({
    build,
    setBuild,
    showError,
    removeFromSlot,
    setTargetSlot,
    children,
}) {
    // Enable Dragging
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                delay: 0,
                tolerance: 0,
            },
        }),
    );
    const [draggedItem, setDraggedItem] = useState(null);
    const [pointerPosition, setPointerPosition] = useState(null);

    // Keep Preview aligned with our pointer when dragging
    useEffect(() => {
        if (!draggedItem) return undefined;

        const handlePointerMove = (event) => {
            setPointerPosition({ x: event.clientX, y: event.clientY });
        };

        window.addEventListener('pointermove', handlePointerMove);
        return () => window.removeEventListener('pointermove', handlePointerMove);
    }, [draggedItem]);

    // Item gets "stored" when you begin to drag
    const handleDragStart = ({ active, activatorEvent }) => {
        const item = active.data.current.item;
        setDraggedItem(item);
        if (activatorEvent && 'clientX' in activatorEvent) {
            setPointerPosition({
                x: activatorEvent.clientX,
                y: activatorEvent.clientY,
            });
        }
        showError('');
    };

    // Validate the rune drop and add or move the item
    const handleDragEnd = ({ active, over }) => {
        setDraggedItem(null);
        setPointerPosition(null);
        if (!over) return;

        const { item, from } = active.data.current;

        if (over.id === 'list') {
            if (from) removeFromSlot(from, item.uid);
            return;
        }

        if (over.id === from) return;

        if (!canPlaceInSlot(item, over.id)) {
            const compatibleSlots = getCompatibleSlots(item);
            const requiredSlots = compatibleSlots.length > 0 ? compatibleSlots.join(' or ') : 'a supported';
            showError(`${item.name} can only be placed in the ${requiredSlots} slot.`);
            return;
        }

        const destinationItems = build[over.id];
        const hasMasterRune = destinationItems.some(isMasterRune);
        if (isMasterRune(item) && hasMasterRune) {
            showError(`${over.id} can only contain one Master Rune.`);
            return;
        }

        const used = slotUsed(destinationItems);
        if (used + slotCost(item) > MAX_PER_SLOT) {
            showError(`${over.id} is full (${used}/${MAX_PER_SLOT}). Remove a rune from it before adding ${item.name}.`);
            return;
        }

        setBuild((previousBuild) => {
            const nextBuild = Object.fromEntries(
                Object.entries(previousBuild).map(([slotName, slotItems]) => [slotName, [...slotItems]]),
            );

            if (from) {
                nextBuild[from] = nextBuild[from].filter((placedItem) => placedItem.uid !== item.uid);
            }

            const uid = item.uid ?? crypto.randomUUID();
            nextBuild[over.id].push({ ...item, uid });
            return nextBuild;
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
        // Connect drag events and drop targets
        <DndContext
            sensors={sensors}
            collisionDetection={cursorCollisionDetection}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={() => {
                setDraggedItem(null);
                setPointerPosition(null);
            }}
        >
            {children({
                slot,
                DraggableListItem,
            })}
            {/* Shows our data preview while dragging */}
            {draggedItem && pointerPosition
                ? createPortal(
                    <div
                        className="drag-preview"
                        style={{
                            left: pointerPosition.x,
                            top: pointerPosition.y,
                        }}
                    >
                        <strong>{draggedItem.name}</strong>
                        <p>{draggedItem.description}</p>
                    </div>,
                    document.body,
                )
                : null}
        </DndContext>
    );
}