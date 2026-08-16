import React, { useState } from 'react';
import { BookOpen, Search, ExternalLink, Sparkles, X, Plus, Check } from 'lucide-react';
import { WikiCard } from '../types';

interface WikiLoreCodexProps {
  isOpen: boolean;
  onClose: () => void;
  activeWikiCards: WikiCard[];
  onAddWikiTopicToCampaign: (topic: string) => void;
}

export const WikiLoreCodex: React.FC<WikiLoreCodexProps> = ({
  isOpen,
  onClose,
  activeWikiCards,
  onAddWikiTopicToCampaign,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ title: string; snippet: string }[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<WikiCard | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [addedTopics, setAddedTopics] = useState<string[]>([]);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSelectedArticle(null);

    try {
      const res = await fetch(`/api/wikipedia/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (err) {
      console.error('Wiki search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectArticle = async (title: string) => {
    setIsSearching(true);
    try {
      const res = await fetch(`/api/wikipedia/summary?title=${encodeURIComponent(title)}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedArticle(data);
      }
    } catch (err) {
      console.error('Fetch article summary error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddTopic = (topic: string) => {
    onAddWikiTopicToCampaign(topic);
    setAddedTopics((prev) => [...prev, topic]);
  };

  return (
    <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-stone-900 border border-amber-800/60 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl text-stone-100 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-stone-800 flex items-center justify-between bg-stone-950">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-serif font-bold text-amber-100">
              Wikipedia Historical Codex & Image Search
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-amber-200 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-stone-800 bg-stone-900/50">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Wikipedia for real-world cultures, architecture, myth, or history..."
                className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-9 pr-4 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              Search
            </button>
          </form>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Article Inspector View */}
          {selectedArticle ? (
            <div className="bg-stone-950 p-5 rounded-2xl border border-amber-900/50 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-xl font-serif font-bold text-amber-100 mb-1">
                    {selectedArticle.title}
                  </h4>
                  {selectedArticle.description && (
                    <p className="text-xs text-amber-400 font-medium mb-2">
                      {selectedArticle.description}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleAddTopic(selectedArticle.title)}
                  disabled={addedTopics.includes(selectedArticle.title)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    addedTopics.includes(selectedArticle.title)
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-amber-600 hover:bg-amber-500 text-stone-950 shadow-md'
                  }`}
                >
                  {addedTopics.includes(selectedArticle.title) ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Weaved into Campaign
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      Weave into World
                    </>
                  )}
                </button>
              </div>

              {(selectedArticle.originalImage || selectedArticle.thumbnail) && (
                <div className="rounded-xl overflow-hidden border border-stone-800 max-h-64 flex justify-center bg-stone-900">
                  <img
                    src={selectedArticle.originalImage || selectedArticle.thumbnail || ''}
                    alt={selectedArticle.title}
                    className="max-h-64 object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}

              <p className="text-stone-300 text-xs leading-relaxed font-serif">
                {selectedArticle.extract}
              </p>

              <div className="flex justify-end pt-2">
                <a
                  href={selectedArticle.contentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1"
                >
                  Read full article on Wikipedia <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="space-y-3">
              <h4 className="text-xs font-mono text-stone-400 uppercase tracking-wider">
                Search Results:
              </h4>
              {searchResults.map((res, i) => (
                <div
                  key={i}
                  onClick={() => handleSelectArticle(res.title)}
                  className="bg-stone-950 p-3.5 rounded-xl border border-stone-800 hover:border-amber-700/60 transition-colors cursor-pointer space-y-1"
                >
                  <h5 className="font-serif font-bold text-sm text-amber-200">
                    {res.title}
                  </h5>
                  <p className="text-xs text-stone-400 line-clamp-2 leading-relaxed">
                    {res.snippet}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div>
              <h4 className="text-xs font-mono text-stone-400 uppercase tracking-wider mb-3">
                Active Campaign Wikipedia Inspirations & Visual Assets:
              </h4>

              {activeWikiCards && activeWikiCards.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {activeWikiCards.map((card, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSelectArticle(card.title)}
                      className="bg-stone-950 p-4 rounded-xl border border-stone-800 hover:border-amber-700/60 transition-colors cursor-pointer space-y-2"
                    >
                      {(card.thumbnail || card.originalImage) && (
                        <img
                          src={card.thumbnail || card.originalImage || ''}
                          alt={card.title}
                          className="w-full h-32 object-cover rounded-lg border border-stone-800"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <h5 className="font-serif font-bold text-sm text-amber-200">
                        {card.title}
                      </h5>
                      <p className="text-xs text-stone-400 line-clamp-2">
                        {card.extract}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-stone-500 text-xs">
                  Search for any historical topic above to discover Wikipedia lore and imagery!
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
