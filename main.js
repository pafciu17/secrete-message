const R = require('ramda')
const Jimp = require('jimp')

const preparePixelInfo = (image, x, y) => {
  const color = Jimp.intToRGBA(image.getPixelColor(x, y))
  return R.mergeAll([{ x, y, direction: getPixelDirection(color)}, color])
}

const imageToPixels = image => {
  const { width, height } = image.bitmap
  return R.map(
    x => R.map(y => preparePixelInfo(image, x, y), R.range(0, height))
  )(R.range(0, width))
}

const getPixelDirection = ({r, g, b}) => {
  if (r === 7 && g === 84 && b === 19) {
    return 'start-up'
  } else if (r === 139 && g === 57 && b === 137) {
    return 'start-left'
  } else if (r === 51 && g === 69 && b === 169) {
    return 'stop'
  } else if (r === 182 && g === 149 && b === 72) {
    return 'right'
  } else if (r === 123 && g === 131 && b === 154) {
    return 'left'
  } else {
    return null
  }
}

const mapStartDirectionToDelta = direction => {
  switch (direction) {
    case 'start-up':
      return {x: 0, y: -1}
    case 'start-left':
      return {x: -1, y: 0}
    default:
      return null
  }
}

const mapDirectionToDelta = (currenctDelta, direction) => {
  if (direction === 'stop') {
    return null
  } else if (R.contains(direction, ['left', 'right'])) {
    if (currenctDelta.y === -1) {
      return {
        x: direction === 'left' ? -1 : 1,
        y: 0
      }
    } else if (currenctDelta.x === 1) {
      return {
        x: 0,
        y: direction === 'left' ? -1 : 1
      }
    } else if (currenctDelta.y === 1) {
      return {
        x: direction === 'left' ? 1 : -1,
        y: 0
      }
    } else if (currenctDelta.x === -1) {
      return {
        x: 0,
        y: direction === 'left' ? 1 : -1
      }
    }
  } else {
    return currenctDelta
  }
}

const isStartDrawingPixel = ({ direction }) => R.contains(direction, ['start-up', 'start-left'])

const getStartDrawingPixels = pixels => [R.filter(isStartDrawingPixel, R.flatten(pixels)), pixels]

const getNextPixel = (pixel, allPixels, delta) => allPixels[pixel.x + delta.x][pixel.y + delta.y]

const getNextPixels = (pixel, allPixels, delta) => {
  const newDelta = mapDirectionToDelta(delta, pixel.direction)
  if (newDelta) {
    const nextPixel = getNextPixel(pixel, allPixels, newDelta)
    return R.concat([pixel], getNextPixels(nextPixel, allPixels, newDelta))
  }
  return [pixel]
}

const determineLine = (pixel, allPixels) => {
  const delta = mapStartDirectionToDelta(pixel.direction)
  const nextPixel = getNextPixel(pixel, allPixels, delta)
  return R.concat([pixel], getNextPixels(nextPixel, allPixels, delta))
}

const determineLines = ([startingPoints, allPixels]) => ({
  lines: R.map(pixel => determineLine(pixel, allPixels), startingPoints),
  size: {
    width: allPixels.length,
    height: allPixels[0].length
  }
})

const drawAndSaveImage = ({ lines, size }, outputFile) => {
  const image = new Jimp(size.width, size.height)
  R.map(
    ({ x, y }) => image.setPixelColor(Jimp.rgbaToInt(0, 0, 0, 255), x, y),
    R.flatten(lines)
  )
  image.write(outputFile)
}

Jimp.read('input.png')
  .then(image => imageToPixels(image))
  .then(getStartDrawingPixels)
  .then(determineLines)
  .then(outputImageData => drawAndSaveImage(outputImageData, 'output.png'))
  .catch(err => console.log(err))