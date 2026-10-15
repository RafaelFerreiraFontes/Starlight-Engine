"""Procedural raster calibration atlas, original fixture. No real-world referents."""
import struct,zlib,pathlib
w,h=128,32
pixels=[[(0,0,0,0) for x in range(w)] for y in range(h)]
def rect(x,y,a,b,c):
 for j in range(y,min(y+b,h)):
  for i in range(x,min(x+a,w)): pixels[j][i]=(*c,255)
for tile in range(8):
 x=tile*16
 base=[(37,47,54),(48,62,67),(58,74,77),(65,82,83),(33,44,51),(100,112,112),(48,76,64),(97,79,48)][tile]
 rect(x,0,16,16,base);rect(x,0,16,1,(96,111,113));rect(x,15,16,1,(24,33,39));rect(x,0,1,16,(67,81,85));rect(x+15,0,1,16,(24,33,39))
 for i in [3,12]:rect(x+i,3,1,1,(109,124,125));rect(x+i,12,1,1,(24,33,39))
 if tile==1:
  for j in range(5,12,3):rect(x+3,j,10,1,(29,40,47))
 if tile==3:rect(x+6,1,4,14,(106,136,116))
 if tile==4:
  rect(x+3,3,10,10,(15,26,34));rect(x+5,5,6,5,(58,114,105));rect(x+6,6,4,2,(153,201,174))
 if tile==5:
  for i in range(2,14,3):rect(x+i,2,1,12,(48,61,65))
 if tile==6:rect(x+2,6,12,4,(120,184,130));rect(x+6,2,4,12,(120,184,130))
 if tile==7:
  for i in range(2,14,4):rect(x+i,3,2,10,(172,147,85))
for frame in range(4):
 x=frame*16
 rect(x+6,17,4,2,(114,179,139));rect(x+4,20,8,9,(182,201,196));rect(x+3,23,10,4,(103,128,130));rect(x+5,19,6,6,(215,225,217));rect(x+6,20,4,3,(48,82,88));rect(x+6,20,4,1,(112,176,160));rect(x+5,29,2,2,(49,67,75));rect(x+9,29,2,2,(49,67,75));rect(x+4,25,8,1,(72,91,95))
 rect(x+7,27,2,1,[(107,165,119),(142,203,145),(179,223,178),(142,203,145)][frame])
raw=b''.join(b'\x00'+bytes(v for pixel in row for v in pixel) for row in pixels)
def chunk(t,data):return struct.pack('>I',len(data))+t+data+struct.pack('>I',zlib.crc32(t+data)&0xffffffff)
png=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(raw))+chunk(b'IEND',b'')
print("export default 'data:image/png;base64,"+__import__('base64').b64encode(png).decode('ascii')+"';")

