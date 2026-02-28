"use client";

import Link from "next/link";
import { DragEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import type {
  KanbanBoard,
  KanbanCard,
  KanbanChecklist,
  KanbanChecklistItem,
  KanbanComment,
  KanbanWorklog,
} from "@/lib/types";

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatSeconds(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}ч ${minutes}м`;
  return `${minutes}м`;
}

function formatDateLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeStyle: "short" }).format(date);
}

// ── KanbanPage ─────────────────────────────────────────────────────────────────

export default function KanbanPage() {
  const [isEmbedded, setIsEmbedded] = useState(false);
  const [boards, setBoards] = useState<KanbanBoard[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [board, setBoard] = useState<KanbanBoard | null>(null);
  const [cards, setCards] = useState<Record<string, KanbanCard[]>>({});
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Board creation
  const [showNewBoard, setShowNewBoard] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState("");
  const [newBoardError, setNewBoardError] = useState<string | null>(null);

  // Column creation
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState("");

  // Card creation
  const [addingToColumnId, setAddingToColumnId] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [newCardDesc, setNewCardDesc] = useState("");
  const [newCardDueDate, setNewCardDueDate] = useState("");

  // Drag-and-drop
  const [dragCardId, setDragCardId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const params = new URLSearchParams(window.location.search);
      setIsEmbedded(params.get("embedded") === "1");
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  // ── Load boards ──────────────────────────────────────────────────────────────

  const loadBoards = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.listBoards();
      setBoards(data);
      if (data.length > 0 && !activeBoardId) {
        setActiveBoardId(data[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки досок");
    } finally {
      setIsLoading(false);
    }
  }, [activeBoardId]);

  useEffect(() => {
    void loadBoards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load active board ────────────────────────────────────────────────────────

  const loadBoard = useCallback(async (boardId: string) => {
    setError(null);
    try {
      const data = await api.getBoard(boardId);
      setBoard(data);

      // Load cards for each column
      if (data.columns && data.columns.length > 0) {
        const cardMap: Record<string, KanbanCard[]> = {};
        await Promise.all(
          data.columns.map(async (col) => {
            try {
              const colCards = await api.listCardsInColumn(col.id);
              cardMap[col.id] = colCards;
            } catch {
              cardMap[col.id] = [];
            }
          }),
        );
        setCards(cardMap);
      } else {
        setCards({});
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки доски");
    }
  }, []);

  useEffect(() => {
    if (activeBoardId) {
      void loadBoard(activeBoardId);
    }
  }, [activeBoardId, loadBoard]);

  const selectedCard = useMemo(() => {
    if (!selectedCardId) return null;
    for (const colCards of Object.values(cards)) {
      const found = colCards.find((c) => c.id === selectedCardId);
      if (found) return found;
    }
    return null;
  }, [selectedCardId, cards]);

  // ── Board actions ────────────────────────────────────────────────────────────

  const onCreateBoard = async (e: FormEvent) => {
    e.preventDefault();
    const title = newBoardTitle.trim();
    if (!title) {
      setNewBoardError("Укажите название доски");
      return;
    }
    setNewBoardError(null);
    try {
      const created = await api.createBoard({ title });
      setBoards((prev) => [...prev, created]);
      setActiveBoardId(created.id);
      setNewBoardTitle("");
      setShowNewBoard(false);
    } catch (err) {
      setNewBoardError(err instanceof Error ? err.message : "Ошибка создания");
    }
  };

  const onDeleteBoard = async () => {
    if (!board) return;
    if (!window.confirm(`Удалить доску «${board.title}»? Все данные будут удалены.`)) return;
    try {
      await api.deleteBoard(board.id);
      const remaining = boards.filter((b) => b.id !== board.id);
      setBoards(remaining);
      setBoard(null);
      setActiveBoardId(remaining.length > 0 ? remaining[0].id : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка удаления");
    }
  };

  // ── Column actions ───────────────────────────────────────────────────────────

  const onCreateColumn = async (e: FormEvent) => {
    e.preventDefault();
    if (!board) return;
    const title = newColumnTitle.trim();
    if (!title) return;
    try {
      const position = (board.columns?.length ?? 0);
      await api.createColumn(board.id, { title, position });
      setNewColumnTitle("");
      setAddingColumn(false);
      await loadBoard(board.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка создания колонки");
    }
  };

  const onDeleteColumn = async (columnId: string) => {
    if (!board) return;
    if (!window.confirm("Удалить колонку вместе со всеми карточками?")) return;
    try {
      await api.deleteColumn(columnId);
      await loadBoard(board.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка удаления колонки");
    }
  };

  // ── Card actions ─────────────────────────────────────────────────────────────

  const onCreateCard = async (e: FormEvent, columnId: string) => {
    e.preventDefault();
    const title = newCardTitle.trim();
    if (!title) return;
    try {
      const position = (cards[columnId]?.length ?? 0);
      const input = {
        title,
        description: newCardDesc.trim() || undefined,
        position,
        dueDate: newCardDueDate || undefined,
      };
      const created = await api.createCard(columnId, input);
      setCards((prev) => ({
        ...prev,
        [columnId]: [...(prev[columnId] ?? []), created],
      }));
      setNewCardTitle("");
      setNewCardDesc("");
      setNewCardDueDate("");
      setAddingToColumnId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка создания карточки");
    }
  };

  const onDeleteCard = async (cardId: string, columnId: string) => {
    if (!window.confirm("Удалить карточку?")) return;
    try {
      await api.deleteCard(cardId);
      setCards((prev) => ({
        ...prev,
        [columnId]: (prev[columnId] ?? []).filter((c) => c.id !== cardId),
      }));
      if (selectedCardId === cardId) setSelectedCardId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка удаления карточки");
    }
  };

  // ── Drag-and-drop ────────────────────────────────────────────────────────────

  const onDragStart = (e: DragEvent<HTMLDivElement>, cardId: string) => {
    setDragCardId(cardId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", cardId);
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumnId(columnId);
  };

  const onDragLeave = () => setDragOverColumnId(null);

  const onDrop = async (e: DragEvent<HTMLDivElement>, columnId: string) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData("text/plain");
    setDragCardId(null);
    setDragOverColumnId(null);
    if (!cardId || !board) return;

    // Find source column
    let sourceColumnId: string | null = null;
    for (const [colId, colCards] of Object.entries(cards)) {
      if (colCards.some((c) => c.id === cardId)) {
        sourceColumnId = colId;
        break;
      }
    }
    if (!sourceColumnId || sourceColumnId === columnId) return;

    const srcColId = sourceColumnId;
    const position = cards[columnId]?.length ?? 0;
    try {
      const moved = await api.moveCard(cardId, { columnId, position });
      setCards((prev) => {
        const src = (prev[srcColId] ?? []).filter((c) => c.id !== cardId);
        const dst = [...(prev[columnId] ?? []), moved];
        return { ...prev, [srcColId]: src, [columnId]: dst };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка перемещения карточки");
    }
  };

  const onDragEnd = () => {
    setDragCardId(null);
    setDragOverColumnId(null);
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className={`home-page-shell ${isEmbedded ? "home-page-shell-embedded" : ""}`}>
      <div className={`home-page-grid ${isEmbedded ? "home-page-grid-embedded" : ""}`}>
        {/* Header */}
        <header className="home-header">
          <div className="home-header-left">
            {!isEmbedded ? (
              <Link href="/" className="home-back-link">
                ← Консоль
              </Link>
            ) : null}
            <div>
              <p className="home-kicker">NetDen</p>
              <h1 className="home-title">Канбан</h1>
              <p className="home-subtitle">Доски задач. Досок: {boards.length}.</p>
            </div>
          </div>
          {!isEmbedded ? (
            <nav className="home-links">
              <Link href="/home" className="home-link">
                Главная
              </Link>
              <Link href="/calendar2" className="home-link">
                Календарь
              </Link>
              <Link href="/notes" className="home-link">
                Заметки
              </Link>
              <Link href="/settings" className="home-link">
                Настройки
              </Link>
            </nav>
          ) : null}
        </header>

        {error ? <p className="notes-error" style={{ margin: "0 0 0.5rem" }}>{error}</p> : null}

        {/* Board selector */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
          {boards.map((b) => (
            <button
              key={b.id}
              type="button"
              className="notes-submit"
              style={{ opacity: activeBoardId === b.id ? 1 : 0.55 }}
              onClick={() => setActiveBoardId(b.id)}
            >
              {b.title}
            </button>
          ))}
          <button
            type="button"
            className="notes-submit"
            onClick={() => setShowNewBoard((v) => !v)}
          >
            {showNewBoard ? "Отмена" : "+ Доска"}
          </button>
        </div>

        {showNewBoard ? (
          <form
            style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem", alignItems: "flex-start" }}
            onSubmit={onCreateBoard}
          >
            <input
              className="notes-input"
              placeholder="Название доски"
              value={newBoardTitle}
              onChange={(e) => setNewBoardTitle(e.target.value)}
              style={{ maxWidth: "300px" }}
            />
            {newBoardError ? <p className="notes-error">{newBoardError}</p> : null}
            <button type="submit" className="notes-submit">Создать</button>
          </form>
        ) : null}

        {isLoading ? (
          <p className="home-muted">Загрузка...</p>
        ) : !board ? (
          <p className="home-muted">
            {boards.length === 0
              ? "Нет досок. Создайте первую доску."
              : "Выберите доску."}
          </p>
        ) : (
          <BoardView
            board={board}
            cards={cards}
            selectedCardId={selectedCardId}
            dragCardId={dragCardId}
            dragOverColumnId={dragOverColumnId}
            addingColumn={addingColumn}
            newColumnTitle={newColumnTitle}
            addingToColumnId={addingToColumnId}
            newCardTitle={newCardTitle}
            newCardDesc={newCardDesc}
            newCardDueDate={newCardDueDate}
            onSelectCard={setSelectedCardId}
            onDeleteCard={onDeleteCard}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onDragEnd={onDragEnd}
            onDeleteBoard={onDeleteBoard}
            onToggleAddColumn={() => {
              setAddingColumn((v) => !v);
              setNewColumnTitle("");
            }}
            onNewColumnTitleChange={setNewColumnTitle}
            onCreateColumn={onCreateColumn}
            onDeleteColumn={onDeleteColumn}
            onToggleAddCard={(colId) => {
              setAddingToColumnId((prev) => (prev === colId ? null : colId));
              setNewCardTitle("");
              setNewCardDesc("");
              setNewCardDueDate("");
            }}
            onNewCardTitleChange={setNewCardTitle}
            onNewCardDescChange={setNewCardDesc}
            onNewCardDueDateChange={setNewCardDueDate}
            onCreateCard={onCreateCard}
          />
        )}

        {/* Card detail panel */}
        {selectedCard ? (
          <CardDetail
            card={selectedCard}
            onClose={() => setSelectedCardId(null)}
            onCardUpdated={(updated) => {
              setCards((prev) => {
                const colId = updated.columnId;
                return {
                  ...prev,
                  [colId]: (prev[colId] ?? []).map((c) => (c.id === updated.id ? updated : c)),
                };
              });
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

// ── BoardView ──────────────────────────────────────────────────────────────────

interface BoardViewProps {
  board: KanbanBoard;
  cards: Record<string, KanbanCard[]>;
  selectedCardId: string | null;
  dragCardId: string | null;
  dragOverColumnId: string | null;
  addingColumn: boolean;
  newColumnTitle: string;
  addingToColumnId: string | null;
  newCardTitle: string;
  newCardDesc: string;
  newCardDueDate: string;
  onSelectCard: (id: string) => void;
  onDeleteCard: (cardId: string, columnId: string) => void;
  onDragStart: (e: DragEvent<HTMLDivElement>, cardId: string) => void;
  onDragOver: (e: DragEvent<HTMLDivElement>, columnId: string) => void;
  onDragLeave: () => void;
  onDrop: (e: DragEvent<HTMLDivElement>, columnId: string) => Promise<void>;
  onDragEnd: () => void;
  onDeleteBoard: () => void;
  onToggleAddColumn: () => void;
  onNewColumnTitleChange: (v: string) => void;
  onCreateColumn: (e: FormEvent) => void;
  onDeleteColumn: (columnId: string) => void;
  onToggleAddCard: (columnId: string) => void;
  onNewCardTitleChange: (v: string) => void;
  onNewCardDescChange: (v: string) => void;
  onNewCardDueDateChange: (v: string) => void;
  onCreateCard: (e: FormEvent, columnId: string) => void;
}

function BoardView({
  board,
  cards,
  selectedCardId,
  dragCardId,
  dragOverColumnId,
  addingColumn,
  newColumnTitle,
  addingToColumnId,
  newCardTitle,
  newCardDesc,
  newCardDueDate,
  onSelectCard,
  onDeleteCard,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onDeleteBoard,
  onToggleAddColumn,
  onNewColumnTitleChange,
  onCreateColumn,
  onDeleteColumn,
  onToggleAddCard,
  onNewCardTitleChange,
  onNewCardDescChange,
  onNewCardDueDateChange,
  onCreateCard,
}: BoardViewProps) {
  const columns = board.columns ?? [];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
        <h2 className="home-title" style={{ fontSize: "1rem", margin: 0 }}>{board.title}</h2>
        <button type="button" className="notes-submit" onClick={onToggleAddColumn}>
          {addingColumn ? "Отмена" : "+ Колонка"}
        </button>
        <button type="button" className="notes-delete" onClick={onDeleteBoard}>
          Удалить доску
        </button>
      </div>

      {addingColumn ? (
        <form
          style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}
          onSubmit={onCreateColumn}
        >
          <input
            className="notes-input"
            placeholder="Название колонки"
            value={newColumnTitle}
            onChange={(e) => onNewColumnTitleChange(e.target.value)}
            style={{ maxWidth: "240px" }}
          />
          <button type="submit" className="notes-submit">Добавить</button>
        </form>
      ) : null}

      {columns.length === 0 ? (
        <p className="home-muted">Нет колонок. Добавьте первую колонку.</p>
      ) : (
        <div style={{ display: "flex", gap: "1rem", overflowX: "auto", paddingBottom: "1rem" }}>
          {columns.map((col) => {
            const colCards = cards[col.id] ?? [];
            const isDragOver = dragOverColumnId === col.id;

            return (
              <div
                key={col.id}
                onDragOver={(e) => onDragOver(e, col.id)}
                onDragLeave={onDragLeave}
                onDrop={(e) => onDrop(e, col.id)}
                style={{
                  minWidth: "240px",
                  maxWidth: "280px",
                  flex: "0 0 auto",
                  borderRadius: "8px",
                  border: isDragOver ? "1.5px solid #5e6ad2" : "1px solid rgba(255,255,255,0.12)",
                  background: isDragOver ? "rgba(94,106,210,0.08)" : "rgba(255,255,255,0.04)",
                  padding: "0.75rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>{col.title}</span>
                    <span style={{ marginLeft: "0.4rem", fontSize: "0.75rem", opacity: 0.55 }}>
                      {colCards.length}
                      {col.wipLimit ? `/${col.wipLimit}` : ""}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "0.25rem" }}>
                    <button
                      type="button"
                      className="notes-submit"
                      style={{ padding: "0.15rem 0.5rem", fontSize: "0.75rem" }}
                      onClick={() => onToggleAddCard(col.id)}
                    >
                      +
                    </button>
                    <button
                      type="button"
                      className="notes-delete"
                      style={{ padding: "0.15rem 0.5rem", fontSize: "0.75rem" }}
                      onClick={() => onDeleteColumn(col.id)}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {addingToColumnId === col.id ? (
                  <form onSubmit={(e) => onCreateCard(e, col.id)} style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                    <input
                      className="notes-input"
                      placeholder="Название карточки"
                      value={newCardTitle}
                      onChange={(e) => onNewCardTitleChange(e.target.value)}
                      autoFocus
                    />
                    <textarea
                      className="notes-textarea"
                      placeholder="Описание"
                      value={newCardDesc}
                      onChange={(e) => onNewCardDescChange(e.target.value)}
                      rows={2}
                    />
                    <input
                      className="notes-input"
                      type="date"
                      placeholder="Срок"
                      value={newCardDueDate}
                      onChange={(e) => onNewCardDueDateChange(e.target.value)}
                    />
                    <div style={{ display: "flex", gap: "0.35rem" }}>
                      <button type="submit" className="notes-submit" style={{ flex: 1 }}>Создать</button>
                      <button
                        type="button"
                        className="notes-submit"
                        style={{ flex: 1, opacity: 0.6 }}
                        onClick={() => onToggleAddCard(col.id)}
                      >
                        Отмена
                      </button>
                    </div>
                  </form>
                ) : null}

                {colCards.map((card) => (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={(e) => onDragStart(e, card.id)}
                    onDragEnd={onDragEnd}
                    style={{
                      borderRadius: "6px",
                      border: selectedCardId === card.id
                        ? "1.5px solid #5e6ad2"
                        : "1px solid rgba(255,255,255,0.1)",
                      background: "rgba(255,255,255,0.05)",
                      padding: "0.5rem 0.6rem",
                      cursor: "grab",
                      opacity: dragCardId === card.id ? 0.4 : 1,
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.25rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.4rem" }}>
                      <button
                        type="button"
                        onClick={() => onSelectCard(card.id)}
                        style={{
                          background: "none",
                          border: "none",
                          padding: 0,
                          textAlign: "left",
                          cursor: "pointer",
                          fontSize: "0.82rem",
                          fontWeight: 500,
                          color: "inherit",
                          flex: 1,
                        }}
                      >
                        {card.title}
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteCard(card.id, col.id)}
                        style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.45, fontSize: "0.75rem", color: "inherit", flexShrink: 0 }}
                      >
                        ✕
                      </button>
                    </div>
                    {card.dueDate ? (
                      <span style={{ fontSize: "0.72rem", opacity: 0.55 }}>📅 {card.dueDate}</span>
                    ) : null}
                    {(card.totalTimeSeconds ?? 0) > 0 ? (
                      <span style={{ fontSize: "0.72rem", opacity: 0.55 }}>⏱ {formatSeconds(card.totalTimeSeconds ?? 0)}</span>
                    ) : null}
                    {(card.checklists?.length ?? 0) > 0 ? (
                      <span style={{ fontSize: "0.72rem", opacity: 0.55 }}>
                        ☑ {(card.checklists ?? []).reduce((s, cl) => s + (cl.items?.filter((i) => i.completed).length ?? 0), 0)}/
                        {(card.checklists ?? []).reduce((s, cl) => s + (cl.items?.length ?? 0), 0)}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── CardDetail ─────────────────────────────────────────────────────────────────

interface CardDetailProps {
  card: KanbanCard;
  onClose: () => void;
  onCardUpdated: (card: KanbanCard) => void;
}

function CardDetail({ card, onClose, onCardUpdated }: CardDetailProps) {
  const [checklists, setChecklists] = useState<KanbanChecklist[]>(card.checklists ?? []);
  const [comments, setComments] = useState<KanbanComment[]>([]);
  const [worklogs, setWorklogs] = useState<KanbanWorklog[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Edit
  const [editTitle, setEditTitle] = useState(card.title);
  const [editDesc, setEditDesc] = useState(card.description);
  const [editDueDate, setEditDueDate] = useState(card.dueDate ?? "");
  const [isSaving, setIsSaving] = useState(false);

  // Comment
  const [commentBody, setCommentBody] = useState("");

  // Checklist
  const [newChecklistTitle, setNewChecklistTitle] = useState("");
  const [addChecklistItemId, setAddChecklistItemId] = useState<string | null>(null);
  const [newItemText, setNewItemText] = useState("");

  // Timer
  const [isTimerRunning, setIsTimerRunning] = useState(!!card.activeWorklogId);

  useEffect(() => {
    void (async () => {
      try {
        const [commentsData, worklogsData] = await Promise.all([
          api.listComments(card.id),
          api.listWorklogs(card.id),
        ]);
        setComments(commentsData);
        setWorklogs(worklogsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка загрузки");
      }
    })();
  }, [card.id]);

  const onSaveCard = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const updated = await api.updateCard(card.id, {
        title: editTitle.trim() || card.title,
        description: editDesc,
        dueDate: editDueDate || null,
      });
      onCardUpdated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setIsSaving(false);
    }
  };

  const onAddComment = async (e: FormEvent) => {
    e.preventDefault();
    const body = commentBody.trim();
    if (!body) return;
    try {
      const created = await api.createComment(card.id, { body });
      setComments((prev) => [...prev, created]);
      setCommentBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка добавления комментария");
    }
  };

  const onDeleteComment = async (commentId: string) => {
    try {
      await api.deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка удаления");
    }
  };

  const onCreateChecklist = async (e: FormEvent) => {
    e.preventDefault();
    const title = newChecklistTitle.trim();
    if (!title) return;
    try {
      const created = await api.createChecklist(card.id, { title });
      setChecklists((prev) => [...prev, { ...created, items: [] }]);
      setNewChecklistTitle("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка создания чеклиста");
    }
  };

  const onAddItem = async (e: FormEvent, checklistId: string) => {
    e.preventDefault();
    const text = newItemText.trim();
    if (!text) return;
    try {
      const position = checklists.find((cl) => cl.id === checklistId)?.items?.length ?? 0;
      const item = await api.createChecklistItem(checklistId, { text, position });
      setChecklists((prev) =>
        prev.map((cl) =>
          cl.id === checklistId ? { ...cl, items: [...(cl.items ?? []), item] } : cl,
        ),
      );
      setNewItemText("");
      setAddChecklistItemId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка добавления пункта");
    }
  };

  const onToggleItem = async (checklistId: string, item: KanbanChecklistItem) => {
    try {
      const updated = await api.updateChecklistItem(item.id, { completed: !item.completed });
      setChecklists((prev) =>
        prev.map((cl) =>
          cl.id === checklistId
            ? { ...cl, items: (cl.items ?? []).map((i) => (i.id === item.id ? updated : i)) }
            : cl,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка обновления пункта");
    }
  };

  const onToggleTimer = async () => {
    try {
      if (isTimerRunning) {
        const log = await api.stopTimer(card.id);
        setWorklogs((prev) => prev.map((w) => (w.id === log.id ? log : w)));
        setIsTimerRunning(false);
      } else {
        const log = await api.startTimer(card.id);
        setWorklogs((prev) => [...prev, log]);
        setIsTimerRunning(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка таймера");
    }
  };

  const totalTracked = worklogs
    .filter((w) => w.durationSeconds != null)
    .reduce((s, w) => s + (w.durationSeconds ?? 0), 0);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "flex-end",
        padding: "1rem",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: "min(480px, 100%)",
          maxHeight: "calc(100vh - 2rem)",
          overflowY: "auto",
          borderRadius: "10px",
          border: "1px solid rgba(255,255,255,0.14)",
          background: "#1a1a2e",
          padding: "1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <h2 style={{ fontSize: "0.95rem", fontWeight: 600, margin: 0 }}>{card.title}</h2>
          <button type="button" onClick={onClose} className="notes-submit" style={{ padding: "0.2rem 0.5rem" }}>✕</button>
        </div>

        {error ? <p className="notes-error">{error}</p> : null}

        {/* Edit form */}
        <form onSubmit={onSaveCard} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <input
            className="notes-input"
            placeholder="Название"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
          />
          <textarea
            className="notes-textarea"
            placeholder="Описание"
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            rows={3}
          />
          <input
            className="notes-input"
            type="date"
            value={editDueDate}
            onChange={(e) => setEditDueDate(e.target.value)}
          />
          <button type="submit" className="notes-submit" disabled={isSaving}>
            {isSaving ? "Сохранение..." : "Сохранить"}
          </button>
        </form>

        {/* Time tracking */}
        <div>
          <p className="notes-section-title">Трекинг времени</p>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <button
              type="button"
              className={isTimerRunning ? "notes-delete" : "notes-submit"}
              onClick={onToggleTimer}
            >
              {isTimerRunning ? "⏹ Стоп" : "▶ Старт"}
            </button>
            {totalTracked > 0 ? (
              <span style={{ fontSize: "0.8rem", opacity: 0.7 }}>
                Всего: {formatSeconds(totalTracked)}
              </span>
            ) : null}
          </div>
          {worklogs.length > 0 ? (
            <ul className="notes-list" style={{ marginTop: "0.5rem" }}>
              {worklogs.map((w) => (
                <li key={w.id} className="notes-item" style={{ padding: "0.25rem 0", border: "none" }}>
                  <span style={{ fontSize: "0.75rem", opacity: 0.65 }}>
                    {formatDateLabel(w.startedAt)}
                    {w.endedAt ? ` → ${formatDateLabel(w.endedAt)}` : " (активен)"}
                    {w.durationSeconds != null ? ` · ${formatSeconds(w.durationSeconds)}` : ""}
                    {w.note ? ` · ${w.note}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {/* Checklists */}
        <div>
          <p className="notes-section-title">Чеклисты</p>
          {checklists.map((cl) => {
            const items = cl.items ?? [];
            const done = items.filter((i) => i.completed).length;
            return (
              <div key={cl.id} style={{ marginBottom: "0.75rem" }}>
                <p style={{ fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                  {cl.title} ({done}/{items.length})
                </p>
                {items.map((item) => (
                  <label
                    key={item.id}
                    style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", cursor: "pointer", marginBottom: "0.2rem" }}
                  >
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => onToggleItem(cl.id, item)}
                    />
                    <span style={{ textDecoration: item.completed ? "line-through" : "none", opacity: item.completed ? 0.5 : 1 }}>
                      {item.text}
                    </span>
                  </label>
                ))}
                {addChecklistItemId === cl.id ? (
                  <form onSubmit={(e) => onAddItem(e, cl.id)} style={{ display: "flex", gap: "0.35rem", marginTop: "0.35rem" }}>
                    <input
                      className="notes-input"
                      placeholder="Новый пункт"
                      value={newItemText}
                      onChange={(e) => setNewItemText(e.target.value)}
                      autoFocus
                    />
                    <button type="submit" className="notes-submit">+</button>
                    <button type="button" className="notes-submit" style={{ opacity: 0.6 }} onClick={() => setAddChecklistItemId(null)}>✕</button>
                  </form>
                ) : (
                  <button
                    type="button"
                    className="notes-submit"
                    style={{ fontSize: "0.75rem", marginTop: "0.25rem", padding: "0.15rem 0.5rem" }}
                    onClick={() => { setAddChecklistItemId(cl.id); setNewItemText(""); }}
                  >
                    + Пункт
                  </button>
                )}
              </div>
            );
          })}
          <form onSubmit={onCreateChecklist} style={{ display: "flex", gap: "0.35rem", marginTop: "0.35rem" }}>
            <input
              className="notes-input"
              placeholder="Новый чеклист"
              value={newChecklistTitle}
              onChange={(e) => setNewChecklistTitle(e.target.value)}
            />
            <button type="submit" className="notes-submit">+</button>
          </form>
        </div>

        {/* Comments */}
        <div>
          <p className="notes-section-title">Комментарии</p>
          {comments.map((c) => (
            <div key={c.id} style={{ marginBottom: "0.5rem", fontSize: "0.8rem", borderLeft: "2px solid rgba(255,255,255,0.12)", paddingLeft: "0.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <p style={{ margin: 0, opacity: 0.9 }}>{c.body}</p>
                <button
                  type="button"
                  onClick={() => onDeleteComment(c.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.4, fontSize: "0.7rem", color: "inherit", flexShrink: 0 }}
                >
                  ✕
                </button>
              </div>
              <span style={{ opacity: 0.45, fontSize: "0.7rem" }}>{formatDateLabel(c.createdAt)}</span>
            </div>
          ))}
          <form onSubmit={onAddComment} style={{ display: "flex", gap: "0.35rem", marginTop: "0.35rem" }}>
            <input
              className="notes-input"
              placeholder="Комментарий..."
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
            />
            <button type="submit" className="notes-submit">→</button>
          </form>
        </div>
      </div>
    </div>
  );
}
