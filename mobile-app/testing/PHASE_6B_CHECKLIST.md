# Phase 6B Mobile Reader Testing Checklist

## Loading
- [ ] Home feed shows skeletons while loading
- [ ] Article screen shows skeleton before content
- [ ] Category/search screens show loading states

## Offline
- [ ] Offline banner appears when disconnected
- [ ] Cached articles open from bookmarks/history when offline
- [ ] Download queue syncs after reconnect

## Search
- [ ] Hindi, English, and mixed queries return results
- [ ] Recent searches persist
- [ ] Category filter works

## Bookmarks
- [ ] Login required to save bookmarks
- [ ] Add/remove bookmark syncs via personalization API
- [ ] Search bookmarks filters list

## Comments
- [ ] Login required to post
- [ ] Like, reply, report, delete own comment

## Notifications
- [ ] Notification history screen loads
- [ ] Mark read / delete works locally

## Personalization
- [ ] Recommendations load for logged-in users
- [ ] Reading history updates on article read

## Performance
- [ ] Home infinite scroll loads more articles
- [ ] Pull-to-refresh works on home/breaking/live
- [ ] FlashList scroll is smooth on mid-range devices
