import {
    Chapter,
    ChapterDetails,
    HomeSection,
    HomeSectionType,
    PartialSourceManga,
    SourceManga,
    Tag,
    TagSection
} from '@paperback/types'
import { decodeHTML } from 'entities'



export const parseMangaDetails = ($: CheerioStatic, mangaId: string): SourceManga => {
    const title  = $('.thumb img').attr('alt') ?? ''
    const image  = $('.thumb img').attr('src') ?? ''
    const desc   = $('.entry-content.entry-content-single').text().trim() ?? ''
    const rating = Number($('div.extra-info div.mobile-rt div.numscore').html() ?? '0')
    let   status = '', author = '', artist = ''

    for (const obj of $('.left-side .imptdt').toArray()) {
        const item = $('i' , obj).text().trim()
        const type = $('h1', obj).text().trim()
        if      (type.toLowerCase().includes('status')) status = item
        else if (type.toLowerCase().includes('author')) author = item
        else if (type.toLowerCase().includes('artist')) artist = item
    }

    const arrayTags: Tag[] = []
    for (const obj of $('.mgen a').toArray()) {
        const id    = $(obj).attr('href')?.replace('https://flamescans.org/genres/', '').replace('/', '') ?? ''
        const label = $(obj).text().trim()
        if (!id || !label) continue
        arrayTags.push({ id: id, label: label })
    }
    const tags: TagSection[] = [App.createTagSection({ id: '0', label: 'genres', tags: arrayTags.map((x) => App.createTag(x)) })]

    return App.createSourceManga({
        id: mangaId,
        mangaInfo: App.createMangaInfo({
            titles: [decodeHTML(title)],
            image,
            rating: Number(rating) ?? 0,
            status,
            artist,
            author,
            tags,
            desc: decodeHTML(desc)
        })
    })
}

export const parseChapters = ($: CheerioStatic): Chapter[] => {
    const chapters: Chapter[] = []
    const arrChapters = $('#chapterlist li').toArray().reverse()


    for (const [index, item] of arrChapters.entries()) {
        const id = $('a', item).attr('href')?.replace(/\/$/, '').split('/').pop()?.replace(/()\d+-|\/$|^\//g, '') ?? ''

        const time = convertTime($('.chapterdate', item).text().trim())

        const name = $('span.chapternum', item)
            .text()
            .replace(/\w+[\r?\n|\r](?:[\d\s-]+)?/g, '')
            .trim()
                
        // const chapNumRegex = name.match(/Chapter (\d+(\.\d+)?)/)
        // let chapNum = 0
        // if (chapNumRegex && chapNumRegex[1]) chapNum = Number(chapNumRegex[1])


        chapters.push(
            App.createChapter({
                id,
                name,
                chapNum: index +1,
                time,
                langCode: '🇬🇧'
            })
        )
    }
    return chapters
}

export const parseChapterDetails = ($: CheerioStatic, mangaId: string, id: string): ChapterDetails => {
    const pages: string[] = []

    const chapterList = $('#readerarea img').toArray()
    for (const obj of chapterList) {
        const imageUrl = $(obj).attr('src')
        if (!imageUrl) continue
        pages.push(imageUrl.trim())
    }

    return App.createChapterDetails({
        id,
        mangaId,
        pages
    })
}

export const parseSearchResults = ($: CheerioStatic): PartialSourceManga[] => {
    const results: PartialSourceManga[] = []

    for (const item of $('.listupd .bsx').toArray()) {
        const mangaId    = $('a', item).attr('href')?.split('series')[1]?.replace(/()\d+-|\/$|^\//g, '') ?? ''
        const title = $('a', item).attr('title') ?? ''
        const image = $('img', item).attr('src') ?? ''
        results.push(
            App.createPartialSourceManga({
                mangaId,
                image,
                title: decodeHTML(title)
            })
        )
    }
    return results
}

export const parseViewMore = ($: CheerioStatic): PartialSourceManga[] => {
    const more: PartialSourceManga[] = []
    for (const item of $('.listupd .bsx').toArray()) {
        const mangaId    = $('a', item).attr('href')?.split('series')[1]?.replace(/()\d+-|\/$|^\//g, '') ?? ''
        const title = $('a', item).attr('title') ?? ''
        const image = $('img', item).attr('src') ?? ''
        more.push(
            App.createPartialSourceManga({
                mangaId,
                image,
                title: decodeHTML(title)
            })
        )
    }
    return more
}

export const parseHomeSections = ($: CheerioStatic, sectionCallback: (section: HomeSection) => void): void => {
    const section1 = App.createHomeSection({ id: '1', title: 'Popular', type: HomeSectionType.featured, containsMoreItems: false})
    const section2 = App.createHomeSection({ id: '2', title: 'Latest', type: HomeSectionType.singleRowNormal, containsMoreItems: true})
    const section3 = App.createHomeSection({ id: '3', title: 'Popular Titles', type: HomeSectionType.singleRowNormal, containsMoreItems: true})

    const featured: PartialSourceManga[] = []
    const popular : PartialSourceManga[] = []
    const latest  : PartialSourceManga[] = []

    const arrFeatured = $('.desktop-slide').toArray()
    const arrPopular  = $('.pop-list-desktop .bsx').toArray()
    const arrLatest   = $('.latest-updates .bsx').toArray()

    for (const obj of arrFeatured) {
        const mangaId     = $(obj).attr('href')?.split('series')[1]?.replace(/()\d+-|\/$|^\//g, '') ?? ''
        const title  = $('.tt', obj).text().trim()
        const strImg = $('.bigbanner', obj).attr('style') ?? ''
        const image  = strImg.substring(23, strImg.length - 3) ?? ''
        featured.push(
            App.createPartialSourceManga({
                mangaId,
                image,
                title: decodeHTML(title)
            })
        )
    }
    section1.items = featured
    sectionCallback(section1)


    for (const item of arrLatest) {
        const mangaId    = $('a', item).attr('href')?.split('series')[1]?.replace(/()\d+-|\/$|^\//g, '') ?? ''
        const title = $('a', item).attr('title') ?? ''
        const image = $('img', item).attr('src') ?? ''
        latest.push(
            App.createPartialSourceManga({
                mangaId,
                image,
                title: decodeHTML(title)
            })
        )
    }

    section2.items = latest
    sectionCallback(section2)

    for (const obj of arrPopular) {
        const mangaId      = $('a', obj).attr('href')?.split('series')[1]?.replace(/()\d+-|\/$|^\//g, '') ?? ''
        const title   = $('a', obj).attr('title') ?? ''
        const subtitle = $('.status', obj).text() ?? ''
        const image   = $('img', obj).attr('src') ?? ''
        popular.push(
            App.createPartialSourceManga({
                mangaId,
                image,
                title: decodeHTML(title),
                subtitle
            })
        )
    }
    section3.items = popular
    sectionCallback(section3)
}

/**
     * Parses a time string from a Madara source into a Date object.
     * Copied from Madara.ts made by gamefuzzy
     */
const convertTime = (timeAgo: string): Date => {
    let time: Date
    let trimmed = Number((/\d*/.exec(timeAgo) ?? [])[0])
    trimmed = trimmed == 0 && timeAgo.includes('a') ? 1 : trimmed
    if (timeAgo.includes('mins') || timeAgo.includes('minutes') || timeAgo.includes('minute')) {
        time = new Date(Date.now() - trimmed * 60000)
    } else if (timeAgo.includes('hours') || timeAgo.includes('hour')) {
        time = new Date(Date.now() - trimmed * 3600000)
    } else if (timeAgo.includes('days') || timeAgo.includes('day')) {
        time = new Date(Date.now() - trimmed * 86400000)
    } else if (timeAgo.includes('year') || timeAgo.includes('years')) {
        time = new Date(Date.now() - trimmed * 31556952000)
    } else {
        time = new Date(timeAgo)
    }

    return time
}
