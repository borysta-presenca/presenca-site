// encode <in> <out.mp4> <width> <height> <bitrate>: H.264 without sound, scaled
import AVFoundation
let a = CommandLine.arguments
let asset = AVURLAsset(url: URL(fileURLWithPath: a[1]))
let out = URL(fileURLWithPath: a[2]); try? FileManager.default.removeItem(at: out)
let w = Int(a[3])!, h = Int(a[4])!, br = Int(a[5])!
let track = asset.tracks(withMediaType: .video).first!
let reader = try! AVAssetReader(asset: asset)
let ro = AVAssetReaderTrackOutput(track: track, outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])
reader.add(ro)
let writer = try! AVAssetWriter(outputURL: out, fileType: .mp4)
writer.shouldOptimizeForNetworkUse = true
let wi = AVAssetWriterInput(mediaType: .video, outputSettings: [
  AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: w, AVVideoHeightKey: h,
  AVVideoScalingModeKey: AVVideoScalingModeResizeAspectFill,
  AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: br, AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel, AVVideoMaxKeyFrameIntervalKey: 60]])
wi.expectsMediaDataInRealTime = false
writer.add(wi)
reader.startReading(); writer.startWriting(); writer.startSession(atSourceTime: .zero)
let q = DispatchQueue(label: "enc"); let done = DispatchSemaphore(value: 0)
wi.requestMediaDataWhenReady(on: q) {
  while wi.isReadyForMoreMediaData {
    if let s = ro.copyNextSampleBuffer() { wi.append(s) } else { wi.markAsFinished(); writer.finishWriting { done.signal() }; return }
  }
}
done.wait()
print(a[2], writer.status == .completed ? "ok" : "fehler \(String(describing: writer.error))")
