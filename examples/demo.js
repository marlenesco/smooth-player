import {SmoothPlayer, mountStandardPlayerUI} from "../dist/index.js";

const playlists = [
    {
        id: "helix",
        title: "FreeSound Community",
        tracks: [
            {
                id: "song-1",
                src: "https://cdn.pixabay.com/audio/2020/08/17/audio_db55c33547.mp3",
                metadata: {title: "BugaBlue", artist: "FreeSound Community"}
            },
            {
                id: "song-2",
                src: "https://cdn.pixabay.com/audio/2020/08/17/audio_613575b827.mp3",
                metadata: {title: "Robot Gypsy Jazz", artist: "FreeSound Community"}
            },
            {
                id: "song-3",
                src: "https://cdn.pixabay.com/audio/2020/08/17/audio_30accddfa3.mp3",
                metadata: {title: "90 vie organique moog", artist: "FreeSound Community"}
            },
        ],
    },
    {
        id: "freesound",
        title: "SoundHelix Extended",
        tracks: [
            {
                id: "song-3",
                src: "/examples/audio/SoundHelix-Song-3.mp3",
                metadata: {title: "SoundHelix Song 3", artist: "SoundHelix"}
            },
            {
                id: "song-4",
                src: "/examples/audio/SoundHelix-Song-1.mp3",
                metadata: {title: "SoundHelix Song 1 (Alt)", artist: "SoundHelix"}
            },
        ],
    },
];

const player = new SmoothPlayer({
    initialVolume: 0.8,
    visualizer: "spectrum",
    accentColor: "#ef6969",
    playlist: playlists,
});

const root = document.querySelector("#player-root");
if (!(root instanceof HTMLElement)) {
    throw new Error("Missing #player-root");
}

mountStandardPlayerUI(player, root);
