import { action } from 'webextension-polyfill'
import { ExtensionResource, getResourceUrl } from '../browser/runtime'
import {
    BadgeIconName,
    DAYS_TO_STALE_DATA,
    LocalStorageMetadataKeys,
    MINUTES_TO_FAILED_SCRAPE,
    ScrapeStatus,
    UserSyncStorageKeys,
} from '../shared/userProfile'
import { getJobCount } from './dataCounts'
import { getLocalStorage, getSyncStorage } from '../browser/storage'
import moment from 'moment'

async function setBadgeText() {
    await action.setBadgeText({ text: 'x' })
}

async function setBadgeIcon(iconName: BadgeIconName) {
    await action.setIcon({
        path: {
            16: getResourceUrl(
                `assets/icons/${iconName}16.png` as ExtensionResource,
            ),
            32: getResourceUrl(
                `assets/icons/${iconName}32.png` as ExtensionResource,
            ),
            48: getResourceUrl(
                `assets/icons/${iconName}48.png` as ExtensionResource,
            ),
            128: getResourceUrl(
                `assets/icons/${iconName}128.png` as ExtensionResource,
            ),
        },
    })
}

async function getBadgeIconName(): Promise<BadgeIconName> {
    let jobCount = await getJobCount()

    const lastSuccessfulScrapeAt = (
        await getLocalStorage(LocalStorageMetadataKeys.SCRAPE_AT)
    )[LocalStorageMetadataKeys.SCRAPE_AT]
    const isDataGood =
        !!lastSuccessfulScrapeAt &&
        moment()
            .utc()
            .subtract(DAYS_TO_STALE_DATA, 'day')
            .isBefore(lastSuccessfulScrapeAt)

    // error?
    const lastHeartbeatAt = (
        await getSyncStorage(UserSyncStorageKeys.LAST_SCRAPE_HEARTBEAT_AT)
    )[UserSyncStorageKeys.LAST_SCRAPE_HEARTBEAT_AT]
    const scrapeStatus = (
        await getSyncStorage(UserSyncStorageKeys.LAST_SCRAPE_STATUS)
    )[UserSyncStorageKeys.LAST_SCRAPE_STATUS]
    // if lastHeartbeatAt is empty or undefined, will be false
    const isHeartbeatDead =
        lastHeartbeatAt &&
        moment()
            .utc()
            .subtract(MINUTES_TO_FAILED_SCRAPE, 'minute')
            .isAfter(lastHeartbeatAt)
    const showError =
        (isHeartbeatDead && scrapeStatus === ScrapeStatus.PENDING) ||
        scrapeStatus === ScrapeStatus.FAILED

    // -- badge icon --
    if (showError) {
        return BadgeIconName.error
    } else if (scrapeStatus === ScrapeStatus.PENDING) {
        return BadgeIconName.loading
    } else if (isDataGood) {
        return BadgeIconName.ok
    } else if (jobCount === 0) {
        return BadgeIconName.blueIcon
    } else {
        return BadgeIconName.warning
    }
}

export async function updateBadge() {
    console.log('updating badge')
    await setBadgeIcon(await getBadgeIconName())
}
