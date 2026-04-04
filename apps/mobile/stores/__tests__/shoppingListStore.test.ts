jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}))

import { useShoppingListStore } from '../shoppingListStore'

beforeEach(() => {
  useShoppingListStore.setState({ checkedByPlan: {} })
})

describe('shoppingListStore', () => {
  it('toggles an item on for a plan', () => {
    useShoppingListStore.getState().toggleItem('plan-1', 'rice|bag|HEB')
    expect(useShoppingListStore.getState().isChecked('plan-1', 'rice|bag|HEB')).toBe(true)
  })

  it('toggles an item back off for a plan', () => {
    useShoppingListStore.getState().toggleItem('plan-1', 'rice|bag|HEB')
    useShoppingListStore.getState().toggleItem('plan-1', 'rice|bag|HEB')
    expect(useShoppingListStore.getState().isChecked('plan-1', 'rice|bag|HEB')).toBe(false)
  })

  it('computes progress for a plan', () => {
    useShoppingListStore.getState().toggleItem('plan-1', 'rice|bag|HEB')
    useShoppingListStore.getState().toggleItem('plan-1', 'beans|can|HEB')

    expect(useShoppingListStore.getState().getCheckedCount('plan-1')).toBe(2)
  })
})
