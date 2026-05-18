// Sprint 7: Shop Panel — Shop grid, daily challenges, and prestige view
import React, { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { SHOP_ITEMS, SHOP_CATEGORIES, getItemsByCategory } from '../../lib/shopData';
import { PRESTIGE_LEVELS } from '../../lib/prestigeSystem';
import type { ShopCategory, ShopItem } from '../../types/game';

type ShopTab = 'shop' | 'challenges' | 'prestige';

export const ShopPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ShopTab>('shop');
  const [selectedCategory, setSelectedCategory] = useState<ShopCategory>('office-upgrade');
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);

  const player = useGameStore((s) => s.player);
  const shopState = useGameStore((s) => s.shopState);
  const prestigeState = useGameStore((s) => s.prestigeState);
  const dailyChallengeState = useGameStore((s) => s.dailyChallengeState);
  const setView = useGameStore((s) => s.setView);
  const buyShopItem = useGameStore((s) => s.buyShopItem);
  const activateConsumable = useGameStore((s) => s.activateConsumable);
  const computeBuffs = useGameStore((s) => s.computeBuffs);
  const claimDailyChallenge = useGameStore((s) => s.claimDailyChallenge);
  const canPrestige = useGameStore((s) => s.canPrestige);
  const doPrestige = useGameStore((s) => s.doPrestige);

  const buffs = computeBuffs();
  const prestigeCheck = canPrestige();
  const ownedSet = new Set(shopState.ownedItems);

  const handleBuy = (item: ShopItem) => {
    buyShopItem(item.id);
    setSelectedItem(getUpdatedItem(item.id));
  };

  const getUpdatedItem = (itemId: string): ShopItem | null => {
    return SHOP_ITEMS.find(i => i.id === itemId) || null;
  };

  const categoryItems = getItemsByCategory(selectedCategory).filter(
    (item) => player.level >= item.requiredLevel
  );

  const lockedCategoryItems = getItemsByCategory(selectedCategory).filter(
    (item) => player.level < item.requiredLevel
  );

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>🛒 Shop & Rewards</h2>
        <button onClick={() => setView('office')} style={styles.closeBtn}>✕</button>
      </div>

      {/* Currency display */}
      <div style={styles.currencyBar}>
        <span>💰 {player.credits.toLocaleString()} credits</span>
        <span>⭐ {player.xp.toLocaleString()} XP</span>
        <span>🏆 {player.reputation} rep</span>
        {prestigeState.prestigeLevel > 0 && (
          <span style={styles.prestigeBadge}>
            {PRESTIGE_LEVELS[prestigeState.prestigeLevel - 1]?.icon} P{prestigeState.prestigeLevel}
          </span>
        )}
      </div>

      {/* Buff display */}
      <div style={styles.buffBar}>
        {buffs.xpMultiplier > 1 && <span style={styles.buff}>⚡ XP x{buffs.xpMultiplier.toFixed(2)}</span>}
        {buffs.creditMultiplier > 1 && <span style={styles.buff}>💰 Credits x{buffs.creditMultiplier.toFixed(2)}</span>}
        {buffs.reputationMultiplier > 1 && <span style={styles.buff}>🏆 Rep x{buffs.reputationMultiplier.toFixed(2)}</span>}
        {buffs.timeExtensionMinutes > 0 && <span style={styles.buff}>⏱️ +{buffs.timeExtensionMinutes}m</span>}
        {buffs.hintDiscountPercent > 0 && <span style={styles.buff}>💡 -{buffs.hintDiscountPercent}% hints</span>}
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {(['shop', 'challenges', 'prestige'] as ShopTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              ...styles.tab,
              ...(activeTab === tab ? styles.tabActive : {}),
            }}
          >
            {tab === 'shop' && '🛍️ Shop'}
            {tab === 'challenges' && '🎯 Challenges'}
            {tab === 'prestige' && '👑 Prestige'}
          </button>
        ))}
      </div>

      {/* === SHOP TAB === */}
      {activeTab === 'shop' && (
        <div style={styles.shopContent}>
          {/* Category sidebar */}
          <div style={styles.categorySidebar}>
            {SHOP_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => { setSelectedCategory(cat.id); setSelectedItem(null); }}
                style={{
                  ...styles.categoryBtn,
                  ...(selectedCategory === cat.id ? styles.categoryBtnActive : {}),
                }}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>

          {/* Item grid */}
          <div style={styles.itemGrid}>
            {[...categoryItems, ...lockedCategoryItems].map((item) => {
              const owned = ownedSet.has(item.id);
              const locked = player.level < item.requiredLevel;
              const canAfford = player.credits >= item.cost;
              const purchaseCount = shopState.ownedItems.filter(id => id === item.id).length;
              const atMax = purchaseCount >= item.maxPurchases;
              const canBuy = !locked && !atMax && canAfford && (item.maxPurchases > 1 || !owned);

              return (
                <div
                  key={item.id}
                  onClick={() => !locked && setSelectedItem(item)}
                  style={{
                    ...styles.itemCard,
                    ...(locked ? styles.itemLocked : {}),
                    ...(selectedItem?.id === item.id ? styles.itemSelected : {}),
                    ...(owned && item.maxPurchases === 1 ? styles.itemOwned : {}),
                  }}
                >
                  <div style={styles.itemIcon}>{item.icon}</div>
                  <div style={styles.itemName}>{item.name}</div>
                  <div style={styles.itemCost}>
                    {locked ? `🔒 Lv${item.requiredLevel}` : `💰 ${item.cost.toLocaleString()}`}
                  </div>
                  {owned && item.maxPurchases === 1 && <div style={styles.ownedBadge}>✓ Owned</div>}
                  {atMax && item.maxPurchases > 1 && <div style={styles.ownedBadge}>Max</div>}
                  {item.consumable && owned && <div style={styles.consumableBadge}>Use</div>}
                </div>
              );
            })}
          </div>

          {/* Item detail sidebar */}
          {selectedItem && (
            <div style={styles.detailSidebar}>
              <h3 style={styles.detailTitle}>{selectedItem.icon} {selectedItem.name}</h3>
              <p style={styles.detailDesc}>{selectedItem.description}</p>
              <div style={styles.detailMeta}>
                <span>Category: {SHOP_CATEGORIES.find(c => c.id === selectedItem.category)?.label}</span>
                <span>Cost: 💰 {selectedItem.cost.toLocaleString()}</span>
                <span>Requires: Lv {selectedItem.requiredLevel}</span>
              </div>

              {selectedItem.buff && (
                <div style={styles.buffDetail}>
                  Permanent buff: {buffLabel(selectedItem.buff)}
                </div>
              )}
              {selectedItem.consumable && (
                <div style={styles.buffDetail}>
                  One-use buff: {buffLabel(selectedItem.consumable)}
                  <br />
                  Duration: {selectedItem.consumable.duration ? `${selectedItem.consumable.duration / 60}m` : '30m'}
                </div>
              )}

              <div style={styles.detailActions}>
                {(!ownedSet.has(selectedItem.id) || selectedItem.maxPurchases > 1) &&
                  player.level >= selectedItem.requiredLevel && (
                  <button
                    onClick={() => handleBuy(selectedItem)}
                    disabled={player.credits < selectedItem.cost}
                    style={{
                      ...styles.buyBtn,
                      ...(player.credits < selectedItem.cost ? styles.buyBtnDisabled : {}),
                    }}
                  >
                    Buy for 💰 {selectedItem.cost.toLocaleString()}
                  </button>
                )}
                {selectedItem.consumable && ownedSet.has(selectedItem.id) && (
                  <button
                    onClick={() => activateConsumable(selectedItem.id)}
                    style={styles.useBtn}
                  >
                    Use Now
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* === CHALLENGES TAB === */}
      {activeTab === 'challenges' && (
        <div style={styles.challengesContent}>
          <h3 style={styles.challengeHeader}>
            🎯 Daily Challenges — {dailyChallengeState?.date || 'Today'}
          </h3>
          {dailyChallengeState?.challenges.map((challenge) => (
            <div
              key={challenge.id}
              style={{
                ...styles.challengeCard,
                ...(challenge.completed ? styles.challengeCompleted : {}),
                ...(challenge.claimed ? styles.challengeClaimed : {}),
              }}
            >
              <div style={styles.challengeInfo}>
                <div style={styles.challengeDesc}>{challenge.description}</div>
                <div style={styles.challengeProgress}>
                  <div style={styles.progressBar}>
                    <div
                      style={{
                        ...styles.progressFill,
                        width: `${Math.min(100, (challenge.progress / challenge.target) * 100)}%`,
                      }}
                    />
                  </div>
                  <span style={styles.progressText}>
                    {challenge.progress}/{challenge.target}
                  </span>
                </div>
                <div style={styles.challengeReward}>
                  Reward: 💰 {challenge.rewardCredits} + ⭐ {challenge.rewardXp} XP
                </div>
              </div>
              <button
                onClick={() => claimDailyChallenge(challenge.id)}
                disabled={!challenge.completed || challenge.claimed}
                style={{
                  ...styles.claimBtn,
                  ...(challenge.claimed
                    ? styles.claimBtnDone
                    : challenge.completed
                    ? styles.claimBtnReady
                    : styles.claimBtnPending),
                }}
              >
                {challenge.claimed ? '✓ Claimed' : challenge.completed ? 'Claim!' : 'In Progress'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* === PRESTIGE TAB === */}
      {activeTab === 'prestige' && (
        <div style={styles.prestigeContent}>
          <h3 style={styles.challengeHeader}>👑 Prestige System</h3>
          <p style={styles.prestigeDesc}>
            Reach career level 8 and earn enough credits to prestige.
            Prestige resets your level, XP, and credits but permanently increases all rewards.
            Office upgrades, certifications, tools, and cosmetics are kept.
          </p>

          <div style={styles.prestigeLevels}>
            {PRESTIGE_LEVELS.map((level) => {
              const isCurrent = prestigeState.prestigeLevel === level.level;
              const isNext = prestigeState.prestigeLevel + 1 === level.level;
              const isPast = prestigeState.prestigeLevel >= level.level;

              return (
                <div
                  key={level.level}
                  style={{
                    ...styles.prestigeLevelCard,
                    ...(isCurrent ? styles.prestigeCurrent : {}),
                    ...(isPast ? styles.prestigePast : {}),
                    ...(isNext ? styles.prestigeNext : {}),
                  }}
                >
                  <div style={styles.prestigeLevelIcon}>{level.icon}</div>
                  <div style={styles.prestigeLevelInfo}>
                    <div style={styles.prestigeLevelName}>
                      P{level.level}: {level.name}
                    </div>
                    <div style={styles.prestigeLevelTitle}>{level.title}</div>
                    <div style={styles.prestigeLevelMult}>
                      {level.multiplier}x all rewards
                    </div>
                    <div style={styles.prestigeLevelCost}>
                      Cost: 💰 {level.requiredCredits.toLocaleString()}
                    </div>
                  </div>
                  {isCurrent && <div style={styles.prestigeActive}>Active</div>}
                  {isPast && !isCurrent && <div style={styles.prestigeDone}>✓</div>}
                </div>
              );
            })}
          </div>

          {prestigeCheck.can && prestigeCheck.nextLevel ? (
            <button onClick={() => doPrestige()} style={styles.prestigeBtn}>
              Prestige to P{prestigeCheck.nextLevel.level}! (Cost: 💰 {prestigeCheck.nextLevel.requiredCredits.toLocaleString()})
            </button>
          ) : (
            <div style={styles.prestigeHint}>
              {player.level < 8
                ? `🔒 Reach career level 8 to prestige (currently level ${player.level})`
                : `💰 Not enough credits for next prestige level`}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

function buffLabel(effect: { type: string; value: number; isFlat: boolean }): string {
  const typeLabels: Record<string, string> = {
    xp_multiplier: 'XP',
    credit_multiplier: 'Credits',
    reputation_multiplier: 'Reputation',
    time_extension: 'Time',
    hint_discount: 'Hint Cost',
    item_drop_bonus: 'Item Drops',
  };
  const label = typeLabels[effect.type] || effect.type;
  if (effect.isFlat) {
    return `+${effect.value} ${label}`;
  }
  return `${effect.value}x ${label}`;
}

// Inline styles
const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(10, 15, 25, 0.97)',
    color: '#e0e0e0',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'monospace',
    zIndex: 100,
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 20px',
    borderBottom: '1px solid #2a3a4a',
  },
  title: { margin: 0, fontSize: '20px', color: '#00d4ff' },
  closeBtn: {
    background: 'none', border: '1px solid #555', color: '#aaa',
    fontSize: '18px', cursor: 'pointer', padding: '4px 12px', borderRadius: '4px',
  },
  currencyBar: {
    display: 'flex', gap: '20px', padding: '8px 20px',
    borderBottom: '1px solid #2a3a4a', fontSize: '14px',
  },
  prestigeBadge: { color: '#ffd700', fontWeight: 'bold', marginLeft: 'auto' },
  buffBar: {
    display: 'flex', gap: '8px', padding: '6px 20px', flexWrap: 'wrap',
    borderBottom: '1px solid #2a3a4a', fontSize: '12px',
  },
  buff: {
    background: '#1a3a2a', color: '#5f5', padding: '2px 8px', borderRadius: '10px',
  },
  tabs: {
    display: 'flex', borderBottom: '2px solid #2a3a4a',
  },
  tab: {
    flex: 1, padding: '10px', background: 'none', border: 'none',
    color: '#888', cursor: 'pointer', fontSize: '14px', borderBottom: '2px solid transparent',
    marginBottom: '-2px',
  },
  tabActive: { color: '#00d4ff', borderBottomColor: '#00d4ff' },
  shopContent: {
    display: 'flex', flex: 1, overflow: 'hidden',
  },
  categorySidebar: {
    width: '160px', borderRight: '1px solid #2a3a4a', overflowY: 'auto', padding: '8px',
  },
  categoryBtn: {
    display: 'block', width: '100%', padding: '8px', marginBottom: '4px',
    background: 'none', border: '1px solid transparent', color: '#aaa',
    cursor: 'pointer', textAlign: 'left' as const, fontSize: '13px', borderRadius: '4px',
  },
  categoryBtnActive: {
    background: '#1a2a3a', borderColor: '#00d4ff', color: '#00d4ff',
  },
  itemGrid: {
    flex: 1, overflowY: 'auto', padding: '12px',
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
    gap: '8px', alignContent: 'start',
  },
  itemCard: {
    padding: '10px', border: '1px solid #2a3a4a', borderRadius: '6px',
    cursor: 'pointer', textAlign: 'center' as const, transition: 'all 0.2s',
    position: 'relative' as const,
  },
  itemLocked: { opacity: 0.4, cursor: 'not-allowed' },
  itemSelected: { borderColor: '#00d4ff', background: '#0d1a2a' },
  itemOwned: { borderColor: '#2a5a2a', background: '#0a1a0a' },
  itemIcon: { fontSize: '28px', marginBottom: '4px' },
  itemName: { fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' },
  itemCost: { fontSize: '12px', color: '#ffd700' },
  ownedBadge: {
    position: 'absolute' as const, top: '4px', right: '4px',
    background: '#2a8a2a', color: '#fff', fontSize: '9px',
    padding: '1px 5px', borderRadius: '8px',
  },
  consumableBadge: {
    position: 'absolute' as const, bottom: '4px', right: '4px',
    background: '#8a6a00', color: '#fff', fontSize: '9px',
    padding: '1px 5px', borderRadius: '8px',
  },
  detailSidebar: {
    width: '260px', borderLeft: '1px solid #2a3a4a', padding: '12px', overflowY: 'auto',
  },
  detailTitle: { color: '#00d4ff', marginBottom: '8px', fontSize: '16px' },
  detailDesc: { fontSize: '12px', color: '#aaa', lineHeight: '1.5', marginBottom: '12px' },
  detailMeta: {
    display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px',
    color: '#888', marginBottom: '12px',
  },
  buffDetail: {
    background: '#1a2a3a', padding: '8px', borderRadius: '4px',
    fontSize: '11px', color: '#5f5', marginBottom: '12px',
  },
  detailActions: { display: 'flex', flexDirection: 'column', gap: '6px' },
  buyBtn: {
    padding: '10px', background: '#0a5a0a', color: '#fff', border: 'none',
    borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold',
  },
  buyBtnDisabled: { background: '#333', color: '#666', cursor: 'not-allowed' },
  useBtn: {
    padding: '10px', background: '#8a6a00', color: '#fff', border: 'none',
    borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold',
  },
  challengesContent: { flex: 1, overflowY: 'auto', padding: '16px' },
  challengeHeader: { color: '#00d4ff', marginBottom: '16px', fontSize: '16px' },
  challengeCard: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px', marginBottom: '8px', border: '1px solid #2a3a4a',
    borderRadius: '6px', background: '#111a25',
  },
  challengeCompleted: { borderColor: '#2a5a2a', background: '#0a1a0a' },
  challengeClaimed: { opacity: 0.5 },
  challengeInfo: { flex: 1, marginRight: '12px' },
  challengeDesc: { fontSize: '13px', marginBottom: '6px' },
  challengeProgress: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' },
  progressBar: {
    flex: 1, height: '6px', background: '#2a3a4a', borderRadius: '3px', overflow: 'hidden',
  },
  progressFill: {
    height: '100%', background: '#00d4ff', borderRadius: '3px', transition: 'width 0.3s',
  },
  progressText: { fontSize: '11px', color: '#888', minWidth: '40px', textAlign: 'right' as const },
  challengeReward: { fontSize: '11px', color: '#ffd700' },
  claimBtn: {
    padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer',
    fontSize: '12px', fontWeight: 'bold', minWidth: '90px',
  },
  claimBtnPending: { background: '#2a3a4a', color: '#888', cursor: 'not-allowed' },
  claimBtnReady: { background: '#0a5a0a', color: '#fff' },
  claimBtnDone: { background: '#333', color: '#666', cursor: 'default' },
  prestigeContent: { flex: 1, overflowY: 'auto', padding: '16px' },
  prestigeDesc: { fontSize: '13px', color: '#aaa', marginBottom: '16px', lineHeight: '1.5' },
  prestigeLevels: { display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' },
  prestigeLevelCard: {
    display: 'flex', alignItems: 'center', gap: '12px', padding: '10px',
    border: '1px solid #2a3a4a', borderRadius: '6px',
  },
  prestigeCurrent: { borderColor: '#ffd700', background: '#1a1a0a' },
  prestigePast: { opacity: 0.6 },
  prestigeNext: { borderColor: '#00d4ff' },
  prestigeLevelIcon: { fontSize: '24px', minWidth: '36px', textAlign: 'center' as const },
  prestigeLevelInfo: { flex: 1 },
  prestigeLevelName: { fontSize: '13px', fontWeight: 'bold', color: '#00d4ff' },
  prestigeLevelTitle: { fontSize: '11px', color: '#888' },
  prestigeLevelMult: { fontSize: '12px', color: '#5f5' },
  prestigeLevelCost: { fontSize: '11px', color: '#ffd700' },
  prestigeActive: { color: '#ffd700', fontSize: '12px', fontWeight: 'bold' },
  prestigeDone: { color: '#5f5', fontSize: '16px' },
  prestigeBtn: {
    width: '100%', padding: '14px', background: '#8a6a00', color: '#fff',
    border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '16px',
    fontWeight: 'bold',
  },
  prestigeHint: {
    textAlign: 'center' as const, padding: '12px', color: '#888',
    fontSize: '13px', fontStyle: 'italic',
  },
};
